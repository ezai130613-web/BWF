"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { captureChatbotLead } from "@/app/(public)/ask-bwf/actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

function getSessionId(): string {
  try {
    const existing = window.localStorage.getItem("bwf_chat_session_id");
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem("bwf_chat_session_id", id);
    return id;
  } catch {
    // Private-browsing / storage-blocked fallback — conversation just won't
    // persist across a reload, chat itself still works.
    return crypto.randomUUID();
  }
}

const leadInitialState: { error?: string; success?: boolean } = {};

function LeadCaptureForm({ sessionId, defaultRequirement }: { sessionId: string; defaultRequirement: string }) {
  const [state, formAction, pending] = useActionState(captureChatbotLead, leadInitialState);

  if (state?.success) {
    return (
      <div className="border-t border-navy-700 p-4 text-sm text-ivory-100">
        Thanks — BWF will reach out to you shortly.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-navy-700 p-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="text-sm font-medium text-ivory-100">Want BWF to connect with you?</p>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
        Name
        <input
          name="name"
          required
          className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
        Phone
        <input
          name="phone"
          required
          className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
        Email (optional)
        <input
          name="email"
          type="email"
          className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
        What do you need?
        <textarea
          name="requirement"
          required
          rows={2}
          defaultValue={defaultRequirement}
          className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
        />
      </label>
      {state?.error ? <p className="text-xs text-red-400">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gold-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Connect me with BWF"}
      </button>
    </form>
  );
}

export function AskBwfWidget({ onClose }: { onClose: () => void }) {
  // Lazy initializer, not an effect: this component only ever mounts after a
  // user clicks the launcher (AskBwfLauncher's `open` state starts false), so
  // by the time it renders we're already client-side — no SSR/hydration pass
  // touches it, and reading localStorage here is safe.
  const [sessionId] = useState(() => getSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setPending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.unavailable) {
          setUnavailable(true);
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const payload = JSON.parse(chunk.slice(6));
          if (payload.text) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { role: "assistant", content: last.content + payload.text };
              return next;
            });
          } else if (payload.error) {
            setError(payload.error);
          }
        }
      }
    } catch {
      setError("Network error — please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setPending(false);
    }
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-sm border border-navy-700 bg-navy-950 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between border-b border-navy-700 px-4 py-3">
        <p className="font-display text-base text-ivory-100">Ask BWF</p>
        <button type="button" onClick={onClose} aria-label="Close chat" className="text-slate-400 hover:text-ivory-100">
          ✕
        </button>
      </div>

      {unavailable ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
          Ask BWF isn&rsquo;t available right now — please reach out via WhatsApp or the contact page instead.
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400">
                Ask about BWF chapters, categories, or find a member for your project.
              </p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "self-end rounded-sm border border-gold-500/40 bg-navy-900 px-3 py-2 text-sm text-ivory-100"
                    : "self-start rounded-sm border border-navy-700 px-3 py-2 text-sm text-ivory-100"
                }
              >
                {m.content || (pending && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-navy-700 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={pending}
              className="flex-1 rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="rounded-full bg-gold-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </>
      )}

      {/* Lead capture stays reachable even when the chat itself is
          unavailable — "connect me with BWF" shouldn't depend on the LLM
          being configured. */}
      {showLeadForm ? (
        <LeadCaptureForm sessionId={sessionId} defaultRequirement={lastUserMessage} />
      ) : (
        <button
          type="button"
          onClick={() => setShowLeadForm(true)}
          className="border-t border-navy-700 px-4 py-3 text-left text-sm text-gold-400 hover:text-gold-300"
        >
          Want BWF to connect with you? →
        </button>
      )}
    </div>
  );
}

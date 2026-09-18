"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { deleteConversation, sendScriptChatMessage, type ChatActionState, type ChatMessageRow } from "@/app/admin/(dashboard)/marketing/scripts/actions";

export type ConversationRow = { id: string; title: string | null; updatedAt: Date };

/**
 * Client spec §5A/D — the ChatGPT-style interface plus separate, reopenable
 * chat history. Keyed by the parent page on the active conversation id so
 * switching conversations (a server-driven nav, like the calendar's view
 * links) remounts this with a fresh `useActionState` seeded from that
 * conversation's real messages, rather than needing an effect to reset
 * local state.
 */
export function ScriptChatPanel({
  conversations,
  activeConversationId,
  initialMessages,
  onSaveAsScript,
}: {
  conversations: ConversationRow[];
  activeConversationId: string | null;
  initialMessages: ChatMessageRow[];
  onSaveAsScript: (draft: { title: string; content: string }) => void;
}) {
  const initialState: ChatActionState = { conversationId: activeConversationId ?? undefined, messages: initialMessages };
  const [state, formAction, pending] = useActionState(sendScriptChatMessage, initialState);
  const [deletePending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length]);

  useEffect(() => {
    if (!pending) formRef.current?.reset();
  }, [pending]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/marketing/scripts"
          className="rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + New chat
        </Link>
        <div className="flex flex-col gap-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1" style={{ maxHeight: 420 }}>
          {conversations.map((c) => (
            <div key={c.id} className="group flex items-center gap-1">
              <Link
                href={`/admin/marketing/scripts?conversationId=${c.id}`}
                className={`flex-1 truncate rounded-md px-2 py-1.5 text-xs ${
                  c.id === activeConversationId ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {c.title || "Untitled conversation"}
              </Link>
              <button
                type="button"
                disabled={deletePending}
                title="Delete conversation"
                onClick={() => {
                  if (!confirm("Delete this conversation and its messages?")) return;
                  startTransition(async () => {
                    await deleteConversation(c.id);
                  });
                }}
                className="hidden rounded px-1 text-xs text-neutral-300 hover:bg-neutral-100 hover:text-red-600 group-hover:block"
              >
                ✕
              </button>
            </div>
          ))}
          {conversations.length === 0 ? <p className="p-2 text-center text-xs text-neutral-400">No conversations yet.</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex max-h-[420px] min-h-[220px] flex-col gap-3 overflow-y-auto pr-1">
          {state.messages.length === 0 ? (
            <p className="m-auto text-sm text-neutral-400">Ask for a script, caption, or content idea to get started.</p>
          ) : null}
          {state.messages.map((m) => (
            <div key={m.id} className={`flex flex-col gap-1 ${m.role === "USER" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === "USER" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {m.content}
              </div>
              {m.role === "ASSISTANT" ? (
                <button
                  type="button"
                  onClick={() => onSaveAsScript({ title: m.content.split("\n")[0].slice(0, 60), content: m.content })}
                  className="text-xs font-medium text-neutral-500 underline hover:text-neutral-900"
                >
                  Save as Script
                </button>
              ) : null}
            </div>
          ))}
          {pending ? <div className="max-w-[85%] rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-400">Thinking…</div> : null}
          <div ref={bottomRef} />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <form ref={formRef} action={formAction} className="flex gap-2 border-t border-neutral-100 pt-3">
          <input type="hidden" name="conversationId" value={state.conversationId ?? ""} />
          <textarea
            name="message"
            required
            rows={2}
            placeholder="Ask for a script, caption, or revision…"
            className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={pending}
            className="self-end rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

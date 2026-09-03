"use client";

import { useActionState, useState } from "react";
import { updateChatbotSettings } from "@/app/admin/(dashboard)/chatbot/actions";

const initialState: { error?: string } = {};

export function ChatbotSettingsForm({
  isEnabled,
  accessMode,
  freeQuestionsLimit,
  isConfigured,
}: {
  isEnabled: boolean;
  accessMode: "PUBLIC" | "LOGIN_REQUIRED" | "LIMITED_FREE_QUESTIONS";
  freeQuestionsLimit: number;
  isConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateChatbotSettings, initialState);
  const [mode, setMode] = useState(accessMode);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!isConfigured ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          No ANTHROPIC_API_KEY is set — Ask BWF will show visitors a &ldquo;not available&rdquo;
          state even if enabled below, until a real key is added.
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="isEnabled" defaultChecked={isEnabled} className="h-4 w-4 rounded border-neutral-300" />
        Enabled — show the Ask BWF widget on the public site
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Access mode
        <select
          name="accessMode"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="w-fit rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="PUBLIC">Public — anyone can chat</option>
          <option value="LOGIN_REQUIRED">Login required</option>
          <option value="LIMITED_FREE_QUESTIONS">Limited free questions, then login</option>
        </select>
      </label>

      {mode === "LIMITED_FREE_QUESTIONS" ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Free questions before requiring login
          <input
            type="number"
            name="freeQuestionsLimit"
            min={1}
            max={50}
            defaultValue={freeQuestionsLimit}
            className="w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
      ) : (
        <input type="hidden" name="freeQuestionsLimit" value={freeQuestionsLimit} />
      )}

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

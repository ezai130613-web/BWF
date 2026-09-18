"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/modal";
import { ScriptChatPanel, type ConversationRow } from "@/components/admin/script-chat-panel";
import { MyScriptsSection } from "@/components/admin/my-scripts-section";
import { ScriptEditorForm, type MarketingScriptRow } from "@/components/admin/script-editor-form";
import type { ChatMessageRow } from "@/app/admin/(dashboard)/marketing/scripts/actions";

type ScriptModalState = { mode: "create"; draft?: { title: string; content: string } } | { mode: "edit"; script: MarketingScriptRow } | null;

/**
 * Client spec §5 — ties the AI chat and the My Scripts section together so
 * "Save as Script" on a chat reply opens the same script editor "+ Create
 * New Script" uses, pre-filled rather than duplicated. Saving a script never
 * touches the conversation (§5D) — it only reads a message's text once, at
 * the moment "Save as Script" is clicked.
 */
export function ScriptWritingWorkspace({
  conversations,
  activeConversationId,
  initialMessages,
  scripts,
}: {
  conversations: ConversationRow[];
  activeConversationId: string | null;
  initialMessages: ChatMessageRow[];
  scripts: MarketingScriptRow[];
}) {
  const [scriptModal, setScriptModal] = useState<ScriptModalState>(null);

  return (
    <div className="flex flex-col gap-6">
      <ScriptChatPanel
        key={activeConversationId ?? "new"}
        conversations={conversations}
        activeConversationId={activeConversationId}
        initialMessages={initialMessages}
        onSaveAsScript={(draft) => setScriptModal({ mode: "create", draft })}
      />

      <MyScriptsSection
        scripts={scripts}
        onCreate={() => setScriptModal({ mode: "create" })}
        onEdit={(script) => setScriptModal({ mode: "edit", script })}
      />

      <Modal
        open={scriptModal !== null}
        onClose={() => setScriptModal(null)}
        title={scriptModal?.mode === "edit" ? "Edit script" : "Create new script"}
        wide
      >
        {scriptModal ? (
          <ScriptEditorForm
            script={scriptModal.mode === "edit" ? scriptModal.script : undefined}
            draft={scriptModal.mode === "create" ? scriptModal.draft : undefined}
            onDone={() => setScriptModal(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

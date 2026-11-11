"use client";

import { useMemo, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

/** A document with Preview and Edit tabs, and a Save button on the Edit tab. */
export default function DocPanel({ text, onChange, onSave, status, bad, label }: {
  text: string;
  onChange: (text: string) => void;
  onSave: () => Promise<void>;
  status: string;
  bad?: boolean;
  label: string;
}) {
  const [view, setView] = useState<"preview" | "edit">("preview");
  const [saving, setSaving] = useState(false);
  const html = useMemo(() => renderMarkdown(text), [text]);
  return (
    <>
      <div className="seg" role="tablist">
        <button className={"tab" + (view === "preview" ? " active" : "")} role="tab" onClick={() => setView("preview")}>Preview</button>
        <button className={"tab" + (view === "edit" ? " active" : "")} role="tab" onClick={() => setView("edit")}>Edit</button>
      </div>
      {view === "preview" ? (
        <div className="doc" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div>
          <textarea className="raw editor" spellCheck aria-label={label} value={text} onChange={(e) => onChange(e.target.value)} />
          <div className="save-row">
            <button
              className="btn btn-secondary btn-sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await onSave().catch(() => {});
                setSaving(false);
              }}
            >
              {saving ? <><span className="spinner" />Saving…</> : "Save changes"}
            </button>
            <span className={"save-status" + (bad ? " bad" : "")}>{status}</span>
          </div>
        </div>
      )}
    </>
  );
}

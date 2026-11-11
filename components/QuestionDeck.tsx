"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";

export type QOption = { label: string; description: string };
export type QItem = {
  question: string;
  options: QOption[];
  choice: number | "other" | null;
  other: string;
  skipped: boolean;
};
export type Deck = { items: QItem[]; at: number };

/** Turn whatever the server sent (new questions, or saved answers) into a deck item. */
export function normalize(q: any): QItem {
  if (typeof q === "string") return { question: q, options: [], choice: null, other: "", skipped: false };
  const item: QItem = { question: q.question, options: q.options || [], choice: q.choice ?? null, other: q.other || "", skipped: !!q.skipped };
  // Documents saved before answer choices existed only have a free-text answer.
  if (item.choice === null && !item.other && q.answer && !q.options) {
    item.other = q.answer;
    item.choice = "other";
  }
  return item;
}

function answerText(it: QItem) {
  if (it.choice === "other") return it.other.trim();
  if (it.choice === null) return "";
  const o = it.options[it.choice];
  return o ? `${o.label} (${o.description})` : "";
}

export function answersOf(items: QItem[]) {
  return items.map((it) => ({ ...it, answer: answerText(it) }));
}

/** Questions shown one at a time, each with answer choices plus "Other". */
export default function QuestionDeck({ name, deck, setDeck, submitLabel, busyLabel, onSubmit }: {
  name: string;
  deck: Deck;
  setDeck: Dispatch<SetStateAction<Deck>>;
  submitLabel: string;
  busyLabel: string;
  onSubmit: (items: QItem[]) => Promise<void>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const { items, at } = deck;
  const it = items[at];
  if (!it) return null;
  const n = items.length;
  const last = at === n - 1;

  const go = (i: number) => {
    setDeck((d) => ({ ...d, at: Math.max(0, Math.min(d.items.length - 1, i)) }));
    requestAnimationFrame(() => root.current?.querySelector<HTMLInputElement>(".qopt input")?.focus({ preventScroll: true }));
  };
  const patch = (change: Partial<QItem>): QItem[] => {
    const next = items.map((x, i) => (i === at ? { ...x, ...change } : x));
    setDeck((d) => ({ ...d, items: next }));
    return next;
  };
  const finish = async (list: QItem[]) => {
    setBusy(true);
    try {
      await onSubmit(list);
    } finally {
      setBusy(false);
    }
  };
  const next = () => (last ? finish(items) : go(at + 1));
  const skip = () => {
    const list = patch({ choice: null, other: "", skipped: true });
    if (last) finish(list);
    else go(at + 1);
  };

  const choices: { value: number | "other"; label: string; description: string }[] = [
    ...it.options.map((o, k) => ({ value: k, label: o.label, description: o.description })),
    { value: "other", label: "Other", description: it.options.length ? "Write your own answer" : "Write your answer" },
  ];

  return (
    <div
      ref={root}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !busy) {
          e.preventDefault();
          next();
        }
      }}
    >
      <div className="qcard">
        <div className="qhead">
          <div className="qtitle" id={name + "-title"}>{it.question}</div>
          <div className="qpager">
            <button type="button" aria-label="Previous question" disabled={at === 0} onClick={() => go(at - 1)}>‹</button>
            <span>{at + 1} of {n}</span>
            <button type="button" aria-label="Next question" disabled={last} onClick={() => go(at + 1)}>›</button>
          </div>
        </div>
        <div role="radiogroup" aria-labelledby={name + "-title"}>
          {choices.map((c) => (
            <label className="qopt" key={String(c.value)}>
              <input
                type="radio"
                name={`${name}-${at}`}
                checked={it.choice === c.value}
                onChange={() => patch({ choice: c.value, skipped: false })}
              />
              <span className="dot" />
              <span className="qtext"><b>{c.label}</b><span>{c.description}</span></span>
            </label>
          ))}
          {it.choice === "other" && (
            <div className="qother">
              <textarea
                rows={2}
                autoFocus
                placeholder="Type your answer"
                aria-label="Your answer"
                value={it.other}
                onChange={(e) => patch({ other: e.target.value, skipped: false })}
              />
            </div>
          )}
        </div>
        <div className="qfoot">
          <div className="qdots" aria-hidden="true">
            {items.map((x, i) => {
              const answered = x.choice !== null && (x.choice !== "other" || x.other.trim());
              return (
                <i
                  key={i}
                  title={"Question " + (i + 1)}
                  className={(answered ? "done" : x.skipped ? "skip" : "") + (i === at ? " cur" : "")}
                  onClick={() => go(i)}
                />
              );
            })}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={skip}>Skip</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={next}>
            {busy ? (
              <><span className="spinner" />{busyLabel}</>
            ) : last ? (
              <>{submitLabel} <span className="arrow">→</span><span className="qkey">Ctrl ⏎</span></>
            ) : (
              <>Next <span className="arrow">→</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

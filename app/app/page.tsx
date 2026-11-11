"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLenis } from "lenis/react";
import Topbar from "@/components/Topbar";
import { PageTitle, Pull, Reveal } from "@/components/Motion";
import QuestionDeck, { answersOf, normalize, type Deck, type QItem } from "@/components/QuestionDeck";
import DocPanel from "@/components/DocPanel";
import { api, saveFile } from "@/lib/api";
import { useMe } from "@/lib/session";
import "@/app/styles/tool.css";

type WorkItem = { id: number; type: string; title: string; web_url?: string; children?: WorkItem[] };
type Note = { text: string; kind: "" | "warn" | "bad" | "good" };

const EMPTY: Deck = { items: [], at: 0 };

const TOOLS: { id: string; name: string; file: string; steps: ReactNode[] }[] = [
  { id: "codex", name: "Codex", file: "AGENTS.md", steps: ["Unzip the folder and open a terminal in it.", <>Run <code>codex</code>.</>, "Ask it to read the project instructions and start task 1."] },
  { id: "claude-code", name: "Claude Code", file: "CLAUDE.md", steps: ["Unzip the folder and open a terminal in it.", <>Run <code>claude</code>.</>, "Ask it to read the project instructions and start task 1."] },
  { id: "cursor", name: "Cursor", file: "Cursor rules", steps: ["Unzip the folder and open it in Cursor.", "Open the Agent chat.", "Ask it to read the project instructions and start task 1."] },
  { id: "copilot", name: "GitHub Copilot", file: "Copilot instructions", steps: ["Unzip the folder and open it in VS Code.", "Open Copilot Chat in Agent mode.", "Ask it to read the project instructions and start task 1."] },
  { id: "other", name: "Other tools", file: "AGENTS.md", steps: ["Unzip the folder and open it in your tool.", <>If it doesn&apos;t read <code>AGENTS.md</code> on its own, ask it to.</>, "Ask it to start task 1 of the plan."] },
];

const ICONS = {
  idea: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" /></>,
  ask: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.9c0 1.5-2.2 2-2.2 3.1M12 16.5h.01" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  code: <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />,
  done: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" /></>,
};

function IconTile({ icon }: { icon: keyof typeof ICONS }) {
  return (
    <div className="icon-tile">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[icon]}
      </svg>
    </div>
  );
}

/** A button that shows a spinner and a "working" label while its action runs. */
function BusyButton({ className, label, busyLabel, onRun, disabled }: {
  className: string;
  label: ReactNode;
  busyLabel: string;
  onRun: () => Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onRun();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <><span className="spinner" />{busyLabel}</> : label}
    </button>
  );
}

function CopyButton({ className, label, getText }: { className: string; label: string; getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export default function ToolPage() {
  const me = useMe("org");
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const [step, setStep] = useState(1);
  const [idea, setIdea] = useState("");
  const [err1, setErr1] = useState("");
  const [err2, setErr2] = useState("");
  const [err3, setErr3] = useState("");
  const [err4, setErr4] = useState("");

  // Step 2: questions
  const [deck, setDeck] = useState<Deck>(EMPTY);

  // Step 3: the requirements document
  const [docId, setDocId] = useState<number | null>(null);
  const [doc, setDoc] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ text: "", bad: false });
  const [devopsReady, setDevopsReady] = useState(false);
  const [note, setNote] = useState<Note>({ text: "Checking Azure DevOps connection…", kind: "" });
  const [sent, setSent] = useState<WorkItem[] | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [fbStatus, setFbStatus] = useState("");

  // Step 4: the technical spec
  const [specOpen, setSpecOpen] = useState(false);
  const [specDeck, setSpecDeck] = useState<Deck>(EMPTY);
  const [spec, setSpec] = useState("");
  const [specDirty, setSpecDirty] = useState(false);
  const [specStatus, setSpecStatus] = useState({ text: "", bad: false });
  const [busyTool, setBusyTool] = useState("");
  const [helpTool, setHelpTool] = useState("");
  const [errExport, setErrExport] = useState("");

  const step2 = useRef<HTMLElement>(null);
  const step3 = useRef<HTMLElement>(null);
  const step4 = useRef<HTMLElement>(null);
  const specOut = useRef<HTMLDivElement>(null);
  const sentRef = useRef<HTMLElement>(null);

  // Scroll to a section once React has put it on the page.
  const scrollTo = useCallback((ref: { current: HTMLElement | null }, instant = false) => {
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const smooth = lenisRef.current;
      if (smooth) {
        smooth.resize(); // the page just got taller; tell Lenis before scrolling
        smooth.scrollTo(el, { offset: -84, immediate: instant });
      } else el.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
    }, 120);
  }, []);

  const showDoc = (id: number, text: string) => {
    setDocId(id);
    setDoc(text);
    setDirty(false);
    setSaveStatus({ text: "", bad: false });
    setRating(null);
    setComment("");
    setFbStatus("");
    setSent(null);
    setSpecOpen(false);
    setSpec("");
    setErr3("");
    setStep(3);
  };

  // On first load: Azure DevOps status, an idea typed on the home page, or a saved document to open.
  useEffect(() => {
    if (!me) return;
    api<{ configured: boolean; project: string }>("/api/devops/status")
      .then((d) => {
        setDevopsReady(d.configured);
        setNote(
          d.configured
            ? { text: `Connected to Azure DevOps project “${d.project}”. Sending creates Epics with User Stories under them.`, kind: "" }
            : { text: "Azure DevOps isn't set up yet. Once your admin connects it, you'll be able to send this document as Epics and User Stories.", kind: "warn" }
        );
      })
      .catch(() => setNote({ text: "Couldn't check the Azure DevOps connection.", kind: "bad" }));

    try {
      const pending = sessionStorage.getItem("rs-idea");
      if (pending) setIdea(pending);
      sessionStorage.removeItem("rs-idea");
    } catch {}

    const openId = new URLSearchParams(window.location.search).get("doc");
    if (openId) {
      api("/api/documents/" + encodeURIComponent(openId))
        .then((d) => {
          setIdea(d.idea);
          if (d.qa.length) setDeck({ items: d.qa.map(normalize), at: 0 });
          showDoc(d.id, d.document);
          setRating(d.rating ?? null);
          setComment(d.feedback || "");
          if (d.rating != null) setFbStatus("Thanks for your feedback!");
          if (d.spec) {
            if (d.spec_qa.length) setSpecDeck({ items: d.spec_qa.map(normalize), at: 0 });
            setSpec(d.spec);
            setSpecOpen(true);
            setStep(4);
          }
          scrollTo(step3, true);
        })
        .catch((e) => setErr1(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || specDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, specDirty]);

  const getQuestions = async () => {
    setErr1("");
    try {
      const data = await api("/api/questions", "POST", { idea });
      setDeck({ items: data.questions.map(normalize), at: 0 });
      setDocId(null);
      setSpecOpen(false);
      setSent(null);
      setStep(2);
      scrollTo(step2);
    } catch (e) {
      setErr1((e as Error).message);
    }
  };

  const moreQuestions = async () => {
    setErr2("");
    try {
      const data = await api("/api/questions", "POST", { idea, previous: answersOf(deck.items) });
      setDeck((d) => ({ items: [...d.items, ...data.questions.map(normalize)], at: d.items.length }));
    } catch (e) {
      setErr2((e as Error).message);
    }
  };

  const generateDoc = async (items: QItem[]) => {
    setErr2("");
    try {
      const data = await api("/api/requirements", "POST", { idea, answers: answersOf(items) });
      showDoc(data.id, data.document);
      window.history.replaceState(null, "", "?doc=" + data.id);
      scrollTo(step3);
    } catch (e) {
      setErr2((e as Error).message);
    }
  };

  const saveDoc = async () => {
    if (!docId) return;
    try {
      await api("/api/documents/" + docId, "PUT", { document: doc });
      setDirty(false);
      setSaveStatus({ text: "Saved", bad: false });
    } catch (e) {
      setSaveStatus({ text: (e as Error).message || "Couldn't save.", bad: true });
      throw e;
    }
  };

  const saveSpec = async () => {
    try {
      await api(`/api/documents/${docId}/spec`, "PUT", { spec });
      setSpecDirty(false);
      setSpecStatus({ text: "Saved", bad: false });
    } catch (e) {
      setSpecStatus({ text: (e as Error).message || "Couldn't save.", bad: true });
      throw e;
    }
  };

  const sendDevops = async () => {
    try {
      const data = await api<{ items: WorkItem[] }>("/api/devops/send", "POST", { document: doc });
      setSent(data.items);
      setNote({ text: "Sent to Azure DevOps.", kind: "good" });
      scrollTo(sentRef);
    } catch (e) {
      setNote({ text: (e as Error).message, kind: "bad" });
    }
  };

  const sendFeedback = async () => {
    try {
      await api(`/api/documents/${docId}/feedback`, "POST", { rating, comment });
      setFbStatus("Thanks for your feedback!");
    } catch (e) {
      setFbStatus((e as Error).message);
    }
  };

  const startSpec = async () => {
    setErr3("");
    try {
      if (dirty) await saveDoc();
      const data = await api(`/api/documents/${docId}/spec/questions`, "POST");
      setSpecDeck({ items: data.questions.map(normalize), at: 0 });
      setSpec("");
      setSpecOpen(true);
      setStep(4);
      scrollTo(step4);
    } catch (e) {
      setErr3((e as Error).message);
    }
  };

  const writeSpec = async (items: QItem[]) => {
    setErr4("");
    try {
      const data = await api(`/api/documents/${docId}/spec`, "POST", { answers: answersOf(items) });
      setSpec(data.spec);
      setSpecDirty(false);
      setSpecStatus({ text: "", bad: false });
      scrollTo(specOut);
    } catch (e) {
      setErr4((e as Error).message);
    }
  };

  const codingPrompt = () =>
    [
      "You are building the product described below. Follow the technical specification, and use the requirements for intent.",
      "",
      "- Work through the Implementation plan in order, one task at a time.",
      "- Write tests that prove each user story's acceptance criteria.",
      "- If something is unclear, or listed under Open questions, ask me before guessing.",
      "- Keep each change small, and tell me what you changed and how to check it.",
      "",
      "---",
      "",
      spec.trim(),
      "",
      "---",
      "",
      doc.trim(),
      "",
    ].join("\n");

  // Starter folders for coding tools (built by the server from the saved doc and spec).
  const exportFor = async (tool: string) => {
    setErrExport("");
    setBusyTool(tool);
    try {
      if (specDirty) await saveSpec();
      if (dirty) await saveDoc();
      const res = await fetch(`/api/documents/${docId}/export/${tool}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Couldn't build the download.");
      }
      const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || "starter.zip";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = name;
      a.click();
      setHelpTool(tool);
    } catch (e) {
      setErrExport((e as Error).message);
    } finally {
      setBusyTool("");
    }
  };

  if (!me) return <div className="loading"><span className="spinner" /></div>;
  const help = TOOLS.find((t) => t.id === helpTool);
  const stories = (sent || []).reduce((sum, e) => sum + (e.children?.length || 0), 0);
  const itemLink = (item: WorkItem, kind: string) => (
    <>
      <span className={"type " + kind}>{item.type}</span>
      {item.web_url ? (
        <a href={item.web_url} target="_blank" rel="noopener">#{item.id} {item.title}</a>
      ) : (
        <span>#{item.id} {item.title}</span>
      )}
    </>
  );

  return (
    <div className="pg-tool">
      <Topbar
        orgName={me.org?.name}
        links={[{ label: "My documents", href: "/docs" }, { label: "Usage", href: "/usage" }]}
        signOut="org"
      />

      <main>
        <section className="hero">
          <PageTitle text="Turn an idea into requirements" />
          <p>Describe what you want to build. Answer a few questions. Get a structured requirements document, ready for your team.</p>
        </section>

        <ol className="stepper">
          {["Describe", "Clarify", "Review & export", "Tech spec"].map((label, i) => (
            <li key={label} className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""}>
              <span className="num">{i + 1}</span><span className="label">{label}</span>
            </li>
          ))}
        </ol>

        <Reveal mount delay={0.2}>
          <section className="card step">
            <IconTile icon="idea" />
            <h2>Describe your idea</h2>
            <p className="desc">What should the product do, and who is it for?</p>
            <div className="field">
              <textarea
                rows={4}
                aria-label="Product idea"
                placeholder="e.g. A tool that lets our HR team track new-hire onboarding tasks across departments"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
              <p className="hint-note">
                Your idea and answers are sent to OpenAI to write the document. Don&apos;t include passwords or personal details. <Link href="/privacy">Privacy</Link>
              </p>
              <p className="error">{err1}</p>
            </div>
            <div className="actions">
              <Pull>
                <BusyButton className="btn btn-primary" label={<>Generate questions <span className="arrow">→</span></>} busyLabel="Generating…" onRun={getQuestions} />
              </Pull>
            </div>
          </section>
        </Reveal>

        {deck.items.length > 0 && (
          <Reveal mount>
            <section className="card step" ref={step2}>
              <IconTile icon="ask" />
              <h2>Clarify details</h2>
              <p className="desc">Pick an answer, write your own with &quot;Other&quot;, or skip. Skipped questions become open questions.</p>
              <QuestionDeck name="rq" deck={deck} setDeck={setDeck} submitLabel="Generate document" busyLabel="Writing document…" onSubmit={generateDoc} />
              <p className="error">{err2}</p>
              <div className="actions">
                <BusyButton className="btn btn-secondary btn-sm" label="Ask more questions" busyLabel="Thinking…" onRun={moreQuestions} />
              </div>
            </section>
          </Reveal>
        )}

        {docId !== null && (
          <Reveal mount>
            <section className="card step" ref={step3}>
              <IconTile icon="doc" />
              <h2>Requirements document</h2>
              <p className="desc">
                Review and edit the draft, then download it or send it to your backlog. It&apos;s saved in <Link href="/docs" style={{ color: "inherit" }}>My documents</Link>.
              </p>
              <DocPanel
                label="Edit document (Markdown)"
                text={doc}
                onChange={(t) => {
                  setDoc(t);
                  setDirty(true);
                  setSaveStatus({ text: "Unsaved changes", bad: false });
                }}
                onSave={saveDoc}
                status={saveStatus.text}
                bad={saveStatus.bad}
              />
              <div className="actions">
                <button className="btn btn-primary" onClick={() => saveFile("requirements.md", doc)}>Download .md</button>
                <CopyButton className="btn btn-secondary" label="Copy" getText={() => doc} />
                <span className="spacer" />
                <BusyButton className="btn btn-outline" label={<>Send to Azure DevOps <span className="arrow">→</span></>} busyLabel="Sending…" onRun={sendDevops} disabled={!devopsReady} />
              </div>
              <div className={"devops-note" + (note.kind ? " " + note.kind : "")}>{note.text}</div>

              <div className="next-cta">
                <div>
                  <b>Next: technical spec</b>
                  <span>Turn these requirements into a spec that engineers and AI coding tools can build from.</span>
                </div>
                <Pull>
                  <BusyButton className="btn btn-primary" label={<>Create technical spec <span className="arrow">→</span></>} busyLabel="Thinking…" onRun={startSpec} />
                </Pull>
              </div>
              <p className="error">{err3}</p>

              <div className="feedback">
                <div className="fb-row">
                  <span>Was this document useful?</span>
                  {[1, -1].map((r) => (
                    <button
                      key={r}
                      className={"fb-btn" + (rating === r ? " picked" : "")}
                      aria-label={r === 1 ? "Yes, useful" : "No, not useful"}
                      onClick={() => {
                        setRating(r);
                        setFbStatus("");
                      }}
                    >
                      {r === 1 ? "👍" : "👎"}
                    </button>
                  ))}
                </div>
                {rating !== null && (
                  <div className="fb-more">
                    <textarea rows={2} placeholder="What would have made it better? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                    <div className="save-row">
                      <BusyButton className="btn btn-secondary btn-sm" label="Send feedback" busyLabel="Sending…" onRun={sendFeedback} />
                      <span className="save-status">{fbStatus}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </Reveal>
        )}

        {docId !== null && specOpen && (
          <Reveal mount>
            <section className="card step" ref={step4}>
              <IconTile icon="code" />
              <h2>Technical specification</h2>
              <p className="desc">A few technical questions first. Not sure? Skip it: the spec will list what it assumed.</p>
              <QuestionDeck name="sq" deck={specDeck} setDeck={setSpecDeck} submitLabel="Write spec" busyLabel="Writing spec…" onSubmit={writeSpec} />
              <p className="error">{err4}</p>

              {spec && (
                <div ref={specOut} style={{ marginTop: 28 }}>
                  <DocPanel
                    label="Edit technical spec (Markdown)"
                    text={spec}
                    onChange={(t) => {
                      setSpec(t);
                      setSpecDirty(true);
                      setSpecStatus({ text: "Unsaved changes", bad: false });
                    }}
                    onSave={saveSpec}
                    status={specStatus.text}
                    bad={specStatus.bad}
                  />
                  <div className="actions">
                    <button className="btn btn-primary" onClick={() => saveFile("technical-spec.md", spec)}>Download spec .md</button>
                    <CopyButton className="btn btn-secondary" label="Copy" getText={() => spec} />
                  </div>
                  <div className="coding-ai">
                    <b>Build it with an AI coding tool</b>
                    <span>Download a starter folder for your tool. It has the spec, the requirements, and the instructions file the tool reads on its own.</span>
                    <div className="tools" role="group" aria-label="Export to a coding tool">
                      {TOOLS.map((t) => (
                        <button key={t.id} className={"tool-btn" + (busyTool === t.id ? " busy" : "")} onClick={() => exportFor(t.id)}>
                          <b>{t.name}</b><small>{t.file}</small>
                        </button>
                      ))}
                    </div>
                    {help && (
                      <div className="tool-help">
                        <b>Downloaded for {help.name}. Next:</b>
                        <ol>{help.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                      </div>
                    )}
                    <p className="error">{errExport}</p>
                    <div className="actions" style={{ marginTop: 6 }}>
                      <CopyButton className="btn btn-secondary btn-sm" label="Copy as one prompt" getText={codingPrompt} />
                      <button className="btn btn-outline btn-sm" onClick={() => saveFile("coding-ai-prompt.md", codingPrompt())}>Download prompt .md</button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </Reveal>
        )}

        {sent && (
          <Reveal mount>
            <section className="card step" ref={sentRef}>
              <IconTile icon="done" />
              <h2>Created in Azure DevOps</h2>
              <p className="desc">{sent.length} epics and {stories} stories were created.</p>
              <ul className="items">
                {sent.map((epic) => (
                  <li key={epic.id}>
                    {itemLink(epic, "epic")}
                    <ul>{(epic.children || []).map((s) => <li key={s.id}>{itemLink(s, "story")}</li>)}</ul>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        <footer>Content is AI-generated and may contain mistakes. Review before use. · <Link href="/privacy">Privacy</Link></footer>
      </main>
    </div>
  );
}

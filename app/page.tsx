"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Topbar from "@/components/Topbar";
import Logo from "@/components/Logo";
import { PageTitle, Pull, Reveal } from "@/components/Motion";
import SplitText from "@/components/reactbits/SplitText";
import BlurText from "@/components/reactbits/BlurText";
import ShinyText from "@/components/reactbits/ShinyText";
import CountUp from "@/components/reactbits/CountUp";
import ScrollVelocity from "@/components/reactbits/ScrollVelocity";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import "@/app/styles/home.css";

gsap.registerPlugin(ScrollTrigger);

const prefersLessMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Moves an element a little slower than the page while it scrolls past (GSAP ScrollTrigger). */
function Parallax({ children, className, amount = -16 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prefersLessMotion() || !ref.current) return;
    const tween = gsap.fromTo(
      ref.current,
      { yPercent: -amount / 2 },
      { yPercent: amount / 2, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [amount]);
  return <div ref={ref} className={className}>{children}</div>;
}

/** Tilts toward the pointer (GSAP). */
function Tilt({ children, className, ...rest }: { children: ReactNode; className?: string; "aria-hidden"?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersLessMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);
  return <div ref={ref} className={className} {...rest}>{children}</div>;
}

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <PageTitle tag="h2" text={title} view align="center" />
      {children}
    </div>
  );
}

/** Hero picture: the four stages light up one after another. Hover or tap one to hold it there. */
function Flow() {
  const [lit, setLit] = useState(0);
  const held = useRef(false);
  const tick = useRef(0);
  useEffect(() => {
    if (prefersLessMotion()) {
      setLit(3);
      return;
    }
    // Each tick moves one stage forward; the last stage stays lit for an extra tick before restarting.
    const timer = setInterval(() => {
      if (held.current) return;
      tick.current = (tick.current + 1) % 5;
      setLit(Math.min(tick.current, 3));
    }, 1800);
    return () => clearInterval(timer);
  }, []);
  const hold = (i: number) => ({
    className: "stage" + (i <= lit ? " on" : ""),
    role: "listitem",
    onPointerEnter: () => { held.current = true; tick.current = i; setLit(i); },
    onPointerLeave: () => { held.current = false; },
    onClick: () => { held.current = !held.current; tick.current = i; setLit(i); },
  });
  return (
    <div className="flow art">
      <div className="stages" role="list" aria-label="How an idea becomes a spec">
        <div {...hold(0)}>
          <div className="tag"><i>1</i>Idea</div>
          <h4>Say it in plain words</h4>
          <div className="note-card">&quot;An app that helps HR track new-hire onboarding across teams.&quot;</div>
        </div>
        <div {...hold(1)}>
          <div className="tag"><i>2</i>Questions</div>
          <h4>AI asks what matters</h4>
          <div className="chip">Who adds a new hire?</div>
          <div className="chip ans">HR managers</div>
          <div className="chip extra">When is onboarding done?</div>
        </div>
        <div {...hold(2)}>
          <div className="tag"><i>3</i>Requirements</div>
          <h4>A clear document</h4>
          <div className="mini">
            <b>Epic: New hire setup</b>
            <div className="story">As HR, I add a new hire so tasks start</div>
            <div className="story extra">As a lead, I see my team&apos;s tasks</div>
          </div>
        </div>
        <div {...hold(3)}>
          <div className="tag"><i>4</i>Spec &amp; backlog</div>
          <h4>Ready to build</h4>
          <div className="out">Azure DevOps · 6 stories <span className="ok">✓</span></div>
          <div className="out code">spec → coding AI <span className="ok">✓</span></div>
        </div>
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: ((lit + 1) / 4) * 100 + "%" }} /></div>
      <div className="flow-caption">From a one-line idea to a buildable spec in about 5 minutes.</div>
    </div>
  );
}

/** Demo: type the idea, show questions, build the doc, send it. Loops while on screen. */
function Demo() {
  const IDEA = "An app that helps our HR team track new-hire onboarding";
  const chat = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(0); // how many bubbles are showing
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = chat.current;
    if (!el) return;
    let visible = false;
    let running = false;
    let alive = true;
    const reduce = prefersLessMotion();
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const play = async () => {
      if (running) return;
      running = true;
      while (visible && alive) {
        setShown(1);
        setTyped("");
        setTyping(true);
        for (let i = 1; i <= IDEA.length && alive; i++) {
          setTyped(IDEA.slice(0, i));
          await wait(reduce ? 0 : 38);
        }
        setTyping(false);
        await wait(600); setShown(2);
        await wait(1600); setShown(3);
        await wait(1400); setShown(4);
        await wait(3500);
      }
      running = false;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) play();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, []);

  const on = (n: number) => (shown >= n ? " show" : "");
  return (
    <div className="demo art">
      <Tilt className="window">
        <div className="dots"><i /><i /><i /></div>
        <div className="chat" ref={chat}>
          <div className={"bubble me" + on(1)}><span className={typing ? "caret" : ""}>{typed}</span></div>
          <div className={"bubble ai" + on(2)}>
            A few questions first:
            <ol><li>Who adds a new hire?</li><li>Which teams get tasks?</li><li>When is onboarding finished?</li></ol>
          </div>
          <div className={"bubble ai docmock" + on(3)}>
            {[["t", "55%"], ["", "92%"], ["", "78%"], ["t", "40%"], ["", "88%"], ["", "64%"]].map(([t, w], i) => (
              <div key={i} className={"l " + t} style={{ ["--w" as string]: w }} />
            ))}
          </div>
          <div className={"bubble sent" + on(4)}>✓ 2 epics, 6 stories sent to Azure DevOps</div>
        </div>
      </Tilt>
    </div>
  );
}

function Stat({ big, what, children }: { big: ReactNode; what: string; children: ReactNode }) {
  return (
    <Reveal>
      <SpotlightCard
        className="card stat"
        spotlightColor="rgba(99, 156, 197, 0.35)"
        style={{ ["--spotlight-card-surface" as string]: "var(--surface)", ["--spotlight-card-border" as string]: "var(--border)", ["--spotlight-card-shadow" as string]: "var(--shadow)" }}
      >
        <div className="big">{big}</div>
        <div className="what">{what}</div>
        <div className="rowlist">{children}</div>
      </SpotlightCard>
    </Reveal>
  );
}

const Row = ({ children, opt }: { children: ReactNode; opt?: boolean }) => <div className={"rowitem" + (opt ? " opt" : "")}>{children}</div>;
const Ok = ({ children }: { children: ReactNode }) => <span className="pill-ok">✓ {children}</span>;

const STEPS = [
  {
    label: "Describe", title: "Start with your idea, in plain words",
    text: "Say what you want to build and who it's for, the way you'd explain it to a coworker.",
    mock: <><div className="pill-ui right">An app for HR onboarding</div><div className="pill-ui">Got it! A few questions…</div></>,
  },
  {
    label: "Clarify", title: "Answer a few questions about how it should work",
    text: "The AI asks how it should work, with suggested answers to pick from. Not sure? Skip it, and it becomes an open question.",
    mock: <><div className="pill-ui">Who uses it day to day?</div><div className="pill-ui right">HR managers</div><div className="pill-ui">How do you know it&apos;s done?</div></>,
  },
  {
    label: "Requirements", title: "Get a requirements doc for your backlog",
    text: "It's split into epics and user stories, each with acceptance criteria. You can edit and download it, or send it straight to Azure DevOps.",
    mock: <><div className="bar" style={{ width: "70%", height: 14 }} /><div className="bar" style={{ width: "95%" }} /><div className="bar" style={{ width: "80%" }} /><div className="pill-ui right">Sent to Azure DevOps ✓</div></>,
  },
  {
    label: "Tech spec", title: "Turn it into a spec an AI can build from",
    text: "A few technical questions, then a full spec with a build plan and tests. Copy it straight into GitHub Copilot, Codex, Claude Code or Cursor.",
    mock: <><div className="pill-ui">Web or mobile?</div><div className="bar" style={{ width: "85%", height: 14 }} /><div className="bar" style={{ width: "65%" }} /><div className="pill-ui right">Copied for coding AI ✓</div></>,
  },
];

const FAQ: [string, ReactNode][] = [
  ["Who is it for?", "Anyone who turns ideas into work for engineers: product managers, founders, team leads and architects. If you've ever had to write requirements from a one-line idea, it's for you."],
  ["Do I need to be technical?", "No. The first questions are about how the product should work, not how it's built. The technical spec has its own questions, and you can skip any of them: the spec lists what it assumed."],
  ["Can I change what the AI writes?", "Yes. Every document and spec has an Edit tab, and your changes are saved. You can also ask for more questions before the document is written."],
  ["Does it work with Azure DevOps?", "Yes. Once your admin connects your organization's project, one click creates the epics and user stories, each story linked under its epic."],
  ["Can I use it with AI coding tools?", "Yes. \"Copy for coding AI\" gives you one ready-to-paste prompt with the spec and the requirements, for tools like GitHub Copilot, Codex, Claude Code or Cursor."],
  ["Where does my data go?", <>Your idea and answers are sent to OpenAI to write the questions and documents. Documents are saved in your organization&apos;s private space, and other organizations can&apos;t see them. Read the <Link href="/privacy">privacy page</Link> for details.</>],
  ["How do I get access?", "Each organization signs in with its own code. If you don't have one yet, ask the person who invited you to try Requirements Studio."],
];

export default function HomePage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");

  // The idea typed in the bottom card is waiting in the tool after sign-in.
  const start = (e: FormEvent) => {
    e.preventDefault();
    try {
      if (idea.trim()) sessionStorage.setItem("rs-idea", idea.trim());
    } catch {}
    router.push("/login");
  };

  return (
    <div className="pg-home">
      <Topbar>
        <div className="actions">
          <Link className="signin" href="/login">Sign in</Link>
          <Pull><Link className="btn btn-primary btn-sm" href="/login">Get started <span className="arrow">→</span></Link></Pull>
        </div>
      </Topbar>

      <main>
        <div className="hero-wrap">
          <section className="hero">
            <div className="hero-grid">
              <div className="hero-copy">
                <h1 aria-label="Turn a rough idea into a spec your team can build.">
                  <SplitText tag="span" text="Turn a rough idea into a spec your team can" splitType="chars" mask delay={16} duration={0.9} ease="power4.out" from={{ yPercent: 115, rotate: 4 }} to={{ yPercent: 0, rotate: 0 }} textAlign="left" trigger="load" />
                  <SplitText tag="span" className="hl" text="build." splitType="chars" mask delay={40} duration={1} ease="power4.out" from={{ yPercent: 115, rotate: 4 }} to={{ yPercent: 0, rotate: 0 }} textAlign="left" trigger="load" />
                </h1>
                <BlurText
                  className="sub"
                  text="Type your idea in a sentence. The AI asks how it should work, then writes the requirements and a technical spec that your team, or an AI coding tool, can build from."
                  animateBy="words" direction="bottom" delay={28} trigger="load"
                />
                <Reveal mount delay={0.5}>
                  <div className="cta">
                    <Pull><Link className="btn btn-primary" href="/login">Get started <span className="arrow">→</span></Link></Pull>
                  </div>
                  <p className="note"><ShinyText text="From idea to spec in about 5 minutes." color="var(--muted)" shineColor="var(--text)" speed={3} /></p>
                </Reveal>
              </div>
              <Tilt className="hero-art art" aria-hidden>
                <span className="chip-float c1">&quot;An app for HR onboarding&quot;</span>
                <span className="chip-float dark c2">Who adds a new hire?</span>
                <span className="chip-float c3">Spec ready to build ✓</span>
              </Tilt>
            </div>

            <div className="works">
              Send your work to
              <ScrollVelocity
                texts={[
                  <span key="tools" className="works-row">
                    {["Azure DevOps", "GitHub Copilot", "Codex", "Claude Code", "Cursor", "Markdown"].map((t) => (
                      <span key={t} className="works-item">{t}<i /></span>
                    ))}
                  </span>,
                ]}
                velocity={45}
                numCopies={4}
                fadeEdges
                className="works-text"
                parallaxClassName="parallax works-marquee"
                scrollerClassName="scroller works-scroller"
              />
            </div>

            <Reveal>
              <Flow />
            </Reveal>
          </section>
        </div>

        <section>
          <SectionHead eyebrow="What you get" title="What one idea turns into">
            <BlurText text="The examples below use an HR onboarding tool as the idea." animateBy="words" direction="bottom" delay={30} />
          </SectionHead>
          <div className="stats">
            <Stat big={<>~<CountUp to={5} duration={1.4} /> min</>} what="From a one-line idea to a full spec">
              <Row><span className="grow">Describe your idea</span><span className="num">1 min</span></Row>
              <Row><span className="grow">Answer questions</span><span className="num">3 min</span></Row>
              <Row><span className="grow">Requirements + spec written</span><span className="num">~1 min</span></Row>
            </Stat>
            <Stat big={<><CountUp to={4} duration={1.4} /> steps</>} what="Idea, questions, requirements, spec">
              <Row><span className="num">01</span><span className="grow">Describe</span><Ok>Done</Ok></Row>
              <Row><span className="num">02</span><span className="grow">Clarify</span><Ok>Done</Ok></Row>
              <Row><span className="num">03</span><span className="grow">Requirements</span><Ok>Done</Ok></Row>
              <Row><span className="num">04</span><span className="grow">Tech spec</span><Ok>Done</Ok></Row>
            </Stat>
            <Stat big="2–4" what="Suggested answers for every question">
              <Row><span className="grow"><b>Who adds a new hire?</b></span></Row>
              <Row opt><span className="r on" /><span className="grow">HR managers</span></Row>
              <Row opt><span className="r" /><span className="grow">Hiring managers</span></Row>
              <Row opt><span className="r" /><span className="grow">Other: write your own</span></Row>
            </Stat>
            <Stat big={<><CountUp to={1} duration={1} /> click</>} what="To send epics and user stories to Azure DevOps">
              <Row><span className="grow">Epic: New hire setup</span><Ok>Created</Ok></Row>
              <Row><span className="grow">Story: Add a new hire</span><Ok>Created</Ok></Row>
              <Row><span className="grow">Story: Assign onboarding tasks</span><Ok>Created</Ok></Row>
            </Stat>
          </div>
        </section>

        <section id="how">
          <SectionHead eyebrow="How it works" title="From idea to backlog in one place" />
          {STEPS.map((s, i) => (
            <Reveal key={s.label}>
              <div className={"step" + (i % 2 ? " flip" : "")}>
                <div>
                  <div className="label"><b>0{i + 1}</b>{s.label}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
                <div className={`tile art t${i + 1}`}>
                  <Parallax className="mock">{s.mock}</Parallax>
                </div>
              </div>
            </Reveal>
          ))}
        </section>

        <section id="demo">
          <SectionHead eyebrow="Demo" title="Watch an example" />
          <Reveal>
            <Demo />
          </Reveal>
        </section>

        <section id="faq">
          <SectionHead eyebrow="FAQ" title="Common questions" />
          <Reveal>
            <div className="faq" style={{ margin: "0 auto" }}>
              {FAQ.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        <section>
          <Reveal>
            <div className="cta-card">
              <div className="mark"><Logo size={52} fill="#03203D" /></div>
              <PageTitle tag="h2" text="Try it with your next idea" view align="center" />
              <p>Describe it in one sentence. You&apos;ll have requirements in minutes.</p>
              <form className="idea-form" onSubmit={start}>
                <label className="idea-field">
                  <span className="ico" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
                    </svg>
                  </span>
                  <input type="text" placeholder="An app that helps HR track onboarding" aria-label="Describe your idea" maxLength={500} value={idea} onChange={(e) => setIdea(e.target.value)} />
                </label>
                <button className="btn" type="submit">Start <span className="arrow">→</span></button>
              </form>
              <p className="small">Sign in with your organization&apos;s code to continue.</p>
            </div>
          </Reveal>
        </section>
      </main>

      <footer>
        <div className="foot-top">
          <div className="foot-brand">
            <Link className="brand" href="/"><Logo size={34} /><span>Requirements Studio</span></Link>
            <p>From a rough idea to a buildable spec.</p>
            <Pull><Link className="btn btn-primary" href="/login">Get started <span className="arrow">→</span></Link></Pull>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#demo">Demo</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Sign in</Link>
          </div>
          <div className="foot-col">
            <h4>Company</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/admin/login">Admin</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Requirements Studio.</span>
          <span>AI-generated content may contain mistakes.</span>
          <Link href="/privacy">Privacy</Link>
        </div>
        <div className="wordmark" aria-hidden="true">
          <SplitText tag="span" text="Requirements" splitType="chars" mask delay={45} duration={1.1} ease="power4.out" from={{ yPercent: 110 }} to={{ yPercent: 0 }} textAlign="left" trigger="view" rootMargin="0px" threshold={0} />
        </div>
      </footer>
    </div>
  );
}

/*
 * Motion for every page: Lenis smooth scrolling + GSAP ScrollTrigger, plus small
 * vanilla versions of React Bits effects (SplitText, BlurText, CountUp, Magnet,
 * SpotlightCard, TiltedCard, ScrollVelocity, ClickSpark).
 *
 * Opt in with attributes:
 *   data-split="load|scroll|scrub"  letters rise into place (page h1s get "load" automatically)
 *   data-blur                       words fade in from a blur
 *   data-count="5"                  number counts up from 0 when seen
 *   data-parallax="-12"             moves by that many % of its height while scrolling past
 *   data-tilt                       tilts toward the pointer
 *   data-marquee                    a list that loops sideways and speeds up with scrolling
 *   data-magnet                     pulls toward the pointer (all .btn-primary get it too)
 *   .reveal                         fades up when scrolled into view
 *   .card                           a soft light follows the pointer
 * Everything respects "reduce motion" and still shows content if the scripts fail to load.
 */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // SpotlightCard: a light that follows the pointer over cards. Works without GSAP.
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  }, { passive: true });

  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove("js-motion");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // ---------- Lenis smooth scrolling ----------
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      allowNestedScroll: true, // inner scroll boxes (documents, tables) keep scrolling normally
      anchors: { offset: -84 },
      prevent: (node) => node.nodeName === "TEXTAREA" || node.nodeName === "PRE" || node.hasAttribute("data-lenis-prevent"),
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  }

  // Thin progress line at the top of the page.
  const bar = document.querySelector(".scroll-progress");
  if (bar && !reduce) {
    gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  }

  if (reduce) {
    $$(".reveal").forEach((el) => el.classList.add("in"));
    return;
  }

  // ---------- SplitText: letters rise out of a clipped line ----------
  function splitChars(el) {
    const label = el.textContent.replace(/\s+/g, " ").trim();
    const chars = [];
    (function walk(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const word = document.createElement("span");
            word.className = "split-word";
            word.setAttribute("aria-hidden", "true");
            [...part].forEach((c) => {
              const s = document.createElement("span");
              s.className = "split-char";
              s.textContent = c;
              word.append(s);
              chars.push(s);
            });
            frag.append(word);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains("sr-only")) {
          walk(n);
        }
      });
    })(el);
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = label;
    el.append(sr);
    return chars;
  }

  // Page titles on every page get the effect without needing the attribute.
  $$("main h1").forEach((h) => { if (!h.closest(".doc") && !h.hasAttribute("data-split")) h.setAttribute("data-split", "load"); });

  $$("[data-split]").forEach((el) => {
    const mode = el.getAttribute("data-split") || "scroll";
    const chars = splitChars(el);
    if (mode === "scrub") {
      gsap.from(chars, {
        yPercent: 110, ease: "none", stagger: 0.04,
        scrollTrigger: { trigger: el, start: "top bottom", end: "max", scrub: 0.6 },
      });
      return;
    }
    gsap.from(chars, {
      yPercent: 115, rotate: 4, duration: 1, ease: "power4.out", stagger: 0.016,
      delay: mode === "load" ? 0.1 : 0,
      scrollTrigger: mode === "load" ? undefined : { trigger: el, start: "top 88%", once: true },
    });
  });

  // ---------- BlurText: words come into focus ----------
  $$("[data-blur]").forEach((el) => {
    const words = [];
    (function walk(node) {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span");
            w.style.display = "inline-block";
            w.textContent = part;
            words.push(w);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    const inHero = !!el.closest(".hero");
    gsap.from(words, {
      opacity: 0, filter: "blur(10px)", y: 10, duration: 0.8, ease: "power2.out", stagger: 0.03,
      delay: inHero ? 0.45 : 0,
      clearProps: "filter",
      scrollTrigger: inHero ? undefined : { trigger: el, start: "top 90%", once: true },
    });
  });

  // ---------- Fade-up on scroll ----------
  gsap.set(".reveal", { opacity: 0, y: 28 });
  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, overwrite: true,
      onComplete: () => batch.forEach((el) => { el.classList.add("in"); gsap.set(el, { clearProps: "transform" }); }),
    }),
  });

  // Pages without .reveal sections: everything in <main> rises in once on load.
  if (!document.querySelector(".reveal")) {
    const items = $$("main > *:not(script):not(.hidden)");
    gsap.from(items, { opacity: 0, y: 26, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.15, clearProps: "opacity,transform" });
  }

  // ---------- CountUp ----------
  $$("[data-count]").forEach((el) => {
    const end = parseFloat(el.getAttribute("data-count"));
    const obj = { v: 0 };
    el.textContent = "0";
    gsap.to(obj, {
      v: end, duration: 1.6, ease: "power2.out",
      onUpdate: () => { el.textContent = Math.round(obj.v); },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  // ---------- Parallax ----------
  $$("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.getAttribute("data-parallax")) || -10;
    gsap.fromTo(el, { yPercent: -amount / 2 }, {
      yPercent: amount / 2, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // ---------- ScrollVelocity marquee ----------
  $$("[data-marquee]").forEach((wrap) => {
    const track = wrap.querySelector(".marquee-track");
    const list = track && track.firstElementChild;
    if (!list) return;
    const copy = list.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.append(copy);
    const loop = gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
    loop.totalTime(28 * 200); // room to run backwards when scrolling up
    let target = 1;
    if (lenis) lenis.on("scroll", ({ velocity }) => { target = 1 + Math.max(-5, Math.min(5, velocity / 4)); });
    gsap.ticker.add(() => {
      const t = loop.timeScale();
      loop.timeScale(t + (target - t) * 0.08);
      target += (1 - target) * 0.04;
    });
  });

  if (finePointer) {
    // ---------- TiltedCard ----------
    $$("[data-tilt]").forEach((el) => {
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      });
      el.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });

    // ---------- Magnet buttons ----------
    $$(".btn-primary, [data-magnet]").forEach((el) => {
      const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        if (el.disabled) return;
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.25);
        y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", () => { x(0); y(0); });
    });
  }

  // ---------- ClickSpark on primary buttons ----------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".btn-primary, .idea-form .btn");
    if (!btn || btn.disabled) return;
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.style.left = e.clientX + "px";
      s.style.top = e.clientY + "px";
      document.body.append(s);
      const angle = (i / 8) * Math.PI * 2;
      gsap.fromTo(s, { rotation: (angle * 180) / Math.PI + 90, scaleY: 1, opacity: 1 }, {
        x: Math.cos(angle) * 34, y: Math.sin(angle) * 34, scaleY: 0, opacity: 0,
        duration: 0.5, ease: "power2.out", onComplete: () => s.remove(),
      });
    }
  });

  // Content that loads later (fonts, images) changes heights: re-measure once ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ClickSpark from "@/components/reactbits/ClickSpark";

gsap.registerPlugin(ScrollTrigger);

/** The thin blue-to-red line at the top that fills as you scroll down. */
function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tween = gsap.to(bar.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);
  return <div ref={bar} className="scroll-progress" aria-hidden="true" />;
}

/**
 * Wraps every page: Lenis smooth scrolling (kept in step with GSAP ScrollTrigger)
 * and React Bits click sparks. People who ask their device for less motion get neither.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);
    return () => {
      gsap.ticker.remove(update);
      lenis?.off("scroll", ScrollTrigger.update);
    };
  }, [reduce]);

  const page = (
    <ClickSpark sparkColor="#EB2F33" sparkSize={11} sparkRadius={22} sparkCount={8} duration={450} style={{ height: "auto" }}>
      {children}
    </ClickSpark>
  );

  if (reduce) return page;
  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: 0.1,
        smoothWheel: true,
        allowNestedScroll: true, // inner scroll boxes (documents, tables) keep scrolling normally
        anchors: { offset: -84 },
        prevent: (node: HTMLElement) => node.nodeName === "TEXTAREA" || node.nodeName === "PRE",
      }}
    >
      <ScrollProgress />
      {page}
    </ReactLenis>
  );
}

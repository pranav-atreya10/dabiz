"use client";

// Small helpers that put the React Bits components to work in this design.
import type { ReactNode } from "react";
import SplitText from "@/components/reactbits/SplitText";
import AnimatedContent from "@/components/reactbits/AnimatedContent";
import Magnet from "@/components/reactbits/Magnet";

/** A page title whose letters rise into place (React Bits SplitText). */
export function PageTitle({ text, tag = "h1", view = false, className = "", align = "left" }: {
  text: string;
  tag?: "h1" | "h2";
  view?: boolean; // wait until it is scrolled into view
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <SplitText
      text={text}
      tag={tag}
      className={className}
      splitType="chars"
      effect="rise"
      mask
      delay={16}
      duration={0.9}
      ease="power4.out"
      from={{ yPercent: 115, rotate: 4 }}
      to={{ yPercent: 0, rotate: 0 }}
      textAlign={align}
      trigger={view ? "view" : "load"}
      rootMargin="-60px"
    />
  );
}

/** Fades its content up when scrolled into view (React Bits AnimatedContent). */
export function Reveal({ children, className, delay = 0, mount = false }: {
  children: ReactNode;
  className?: string;
  delay?: number;
  mount?: boolean; // play as soon as the page opens instead of on scroll
}) {
  return (
    <AnimatedContent className={className} distance={28} duration={0.9} ease="power3.out" delay={delay} threshold={0.12} trigger={mount ? "mount" : "scroll"}>
      {children}
    </AnimatedContent>
  );
}

/** Makes a button lean toward the pointer (React Bits Magnet). */
export function Pull({ children }: { children: ReactNode }) {
  return (
    <Magnet padding={36} magnetStrength={3} maxOffset={10} wrapperClassName="magnet-wrap">
      {children}
    </Magnet>
  );
}

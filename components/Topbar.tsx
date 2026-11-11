"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Logo from "./Logo";
import { api } from "@/lib/api";

export type NavLink = { label: string; href: string; here?: boolean };

export const ORG_NAV = (here: "tool" | "docs" | "usage"): NavLink[] => [
  { label: "Tool", href: "/app", here: here === "tool" },
  { label: "Documents", href: "/docs", here: here === "docs" },
  { label: "Usage", href: "/usage", here: here === "usage" },
];

export const ADMIN_NAV = (here: "orgs" | "usage" | "feedback" | ""): NavLink[] => [
  { label: "Orgs", href: "/admin", here: here === "orgs" },
  { label: "Usage", href: "/admin/usage", here: here === "usage" },
  { label: "Feedback", href: "/admin/feedback", here: here === "feedback" },
];

/** The bar at the top of every page. */
export default function Topbar({
  links,
  orgName,
  tag,
  signOut,
  children,
}: {
  links?: NavLink[];
  orgName?: string;
  tag?: string;
  signOut?: "org" | "admin";
  children?: ReactNode;
}) {
  const router = useRouter();
  const out = async () => {
    await api(signOut === "admin" ? "/api/admin/logout" : "/api/logout", "POST").catch(() => {});
    router.push(signOut === "admin" ? "/admin/login" : "/login");
  };
  return (
    <header className={"topbar" + (links ? " has-nav" : "")}>
      <Link className="brand" href="/">
        <Logo />
        <span>Requirements Studio</span>
      </Link>
      {children}
      {(links || signOut) && (
        <nav className="nav">
          {orgName && (
            <span className="org-name" title={"Signed in as " + orgName}>
              {orgName}
            </span>
          )}
          {links?.map((l) => (
            <Link key={l.href} className={"link" + (l.here ? " here" : "")} href={l.href}>
              {l.label}
            </Link>
          ))}
          {tag && <span className="tag">{tag}</span>}
          {signOut && (
            <button className="btn btn-outline btn-sm" type="button" onClick={out}>
              Sign out
            </button>
          )}
        </nav>
      )}
    </header>
  );
}

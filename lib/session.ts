"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export type Me = { org: { name: string } | null; admin: boolean; locked: boolean; admin_locked: boolean };

/**
 * Who is signed in. Pass "org" or "admin" for pages that need a sign-in:
 * visitors who aren't signed in are sent to the right sign-in page.
 * Returns null while checking.
 */
export function useMe(need?: "org" | "admin"): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();
  useEffect(() => {
    let on = true;
    api<Me>("/api/me")
      .then((m) => {
        if (!on) return;
        if (need === "org" && !m.org) router.replace("/login");
        else if (need === "admin" && !m.admin) router.replace("/admin/login");
        else setMe(m);
      })
      .catch(() => {
        if (!on) return;
        if (need) router.replace(need === "admin" ? "/admin/login" : "/login");
        else setMe({ org: null, admin: false, locked: false, admin_locked: false });
      });
    return () => {
      on = false;
    };
  }, [need, router]);
  return me;
}

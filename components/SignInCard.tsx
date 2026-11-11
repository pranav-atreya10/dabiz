"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import { PageTitle, Reveal } from "@/components/Motion";
import { api } from "@/lib/api";
import type { Me } from "@/lib/session";
import "@/app/styles/login.css";

/** The sign-in box, used for both the org code and the admin password. */
export default function SignInCard({ kind, note }: { kind: "org" | "admin"; note: ReactNode }) {
  const admin = kind === "admin";
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Me>("/api/me")
      .then((me) => {
        if (admin ? me.admin : me.org) router.replace(admin ? "/admin" : "/app");
        else if (admin ? me.admin_locked : me.locked) {
          setLocked(true);
          setError(
            admin
              ? "The admin page is locked. The owner needs to set SECRET_KEY, ADMIN_PASSWORD and DATABASE_URL."
              : "This site is locked. The owner needs to set SECRET_KEY and DATABASE_URL."
          );
        }
      })
      .catch(() => {});
  }, [admin, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(admin ? "/api/admin/login" : "/api/login", "POST", admin ? { password: value } : { code: value });
      router.push(admin ? "/admin" : "/app");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="pg-login">
      <Topbar />
      <main className="wrap">
        <Reveal mount>
          <form className="card login" onSubmit={submit}>
            <div className="icon-tile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <rect x="5" y="10.5" width="14" height="10" rx="3" />
                <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
              </svg>
            </div>
            <PageTitle text={admin ? "Admin" : "Sign in"} />
            <p className="lead muted">
              {admin ? "Manage orgs, their sign-in codes, and their Azure DevOps connections." : "Enter the code your organization gave you."}
            </p>
            <label htmlFor="secret">{admin ? "Admin password" : "Org code"}</label>
            <input
              id="secret"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={admin ? undefined : "XXXX-XXXX-XXXX"}
              autoComplete={admin ? "current-password" : "off"}
              autoCapitalize={admin ? undefined : "characters"}
              spellCheck={false}
              autoFocus
              disabled={locked}
            />
            <p className="error" role="alert">{error}</p>
            <button className="btn btn-primary" type="submit" disabled={locked || busy}>
              {busy && <span className="spinner" />}
              Continue <span className="arrow">→</span>
            </button>
            <p className="note">{note}</p>
          </form>
        </Reveal>
      </main>
    </div>
  );
}

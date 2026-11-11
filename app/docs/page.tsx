"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Topbar, { ORG_NAV } from "@/components/Topbar";
import { PageTitle, Pull, Reveal } from "@/components/Motion";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import "@/app/styles/docs.css";

type Doc = { id: number; title: string; rating: number | null; updated: string };

export default function DocsPage() {
  const me = useMe("org");
  const [docs, setDocs] = useState<Doc[] | null>(null);

  useEffect(() => {
    if (me) api<{ documents: Doc[] }>("/api/documents").then((d) => setDocs(d.documents)).catch(() => setDocs([]));
  }, [me]);

  const remove = async (d: Doc) => {
    if (!confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
    try {
      await api("/api/documents/" + d.id, "DELETE");
      setDocs((list) => (list || []).filter((x) => x.id !== d.id));
    } catch {
      alert("Couldn't delete it. Please refresh and try again.");
    }
  };

  if (!me) return <div className="loading"><span className="spinner" /></div>;
  return (
    <div className="pg-docs">
      <Topbar links={ORG_NAV("docs")} signOut="org" />
      <main>
        <div className="head">
          <div>
            <PageTitle text="My documents" />
            <p className="lead">Every document {me.org?.name} has made. Open one to read, edit, download or send it.</p>
          </div>
          <Pull>
            <Link className="btn btn-primary" href="/app">New document <span className="arrow">→</span></Link>
          </Pull>
        </div>

        <Reveal mount delay={0.2}>
          <div className="card list">
            {docs === null ? (
              <div className="empty"><span className="spinner" style={{ display: "inline-block" }} /></div>
            ) : docs.length === 0 ? (
              <div className="empty">
                No documents yet.
                <div><Link className="btn btn-primary" href="/app">Make your first one <span className="arrow">→</span></Link></div>
              </div>
            ) : (
              docs.map((d) => (
                <div className="doc-row" key={d.id}>
                  <Link className="title" href={"/app?doc=" + d.id}>{d.title}</Link>
                  <span className="rate" title={d.rating === 1 ? "Rated useful" : d.rating === -1 ? "Rated not useful" : "Not rated"}>
                    {d.rating === 1 ? "👍" : d.rating === -1 ? "👎" : ""}
                  </span>
                  <span className="when">{d.updated}</span>
                  <button className="del" onClick={() => remove(d)}>Delete</button>
                </div>
              ))
            )}
          </div>
        </Reveal>
      </main>
    </div>
  );
}

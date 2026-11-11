"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { Reveal } from "@/components/Motion";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import "@/app/styles/adoc.css";

type Doc = { id: number; title: string; org_name: string; rating: number | null; feedback: string; idea: string; content: string };

export default function AdminDocumentPage() {
  const me = useMe("admin");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);

  useEffect(() => {
    if (me) api<Doc>("/api/admin/documents/" + encodeURIComponent(id)).then(setDoc).catch(() => router.replace("/admin/feedback"));
  }, [me, id, router]);

  if (!me || !doc) return <div className="loading"><span className="spinner" /></div>;
  return (
    <div className="pg-adoc">
      <Topbar signOut="admin" />
      <main>
        <Link className="back" href="/admin/feedback">← Back to feedback</Link>
        <h1>{doc.title}</h1>
        <p className="meta">
          {doc.org_name || "Deleted org"} · {doc.rating === 1 ? "👍 Useful" : doc.rating === -1 ? "👎 Not useful" : "Not rated"}
        </p>
        <Reveal mount>
          {doc.feedback && <div className="card box"><h2>Their comment</h2><p>{doc.feedback}</p></div>}
          <div className="card box"><h2>Their idea</h2><p>{doc.idea}</p></div>
          <div className="card box"><h2>Document</h2><pre>{doc.content}</pre></div>
        </Reveal>
      </main>
    </div>
  );
}

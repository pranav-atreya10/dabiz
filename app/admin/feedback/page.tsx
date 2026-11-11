"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Topbar, { ADMIN_NAV } from "@/components/Topbar";
import { PageTitle, Reveal } from "@/components/Motion";
import CountUp from "@/components/reactbits/CountUp";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import "@/app/styles/feedback.css";

type Item = { id: number; title: string; rating: number; feedback: string; org_name: string; when: string };
type Data = { ups: number; downs: number; items: Item[] };

export default function AdminFeedbackPage() {
  const me = useMe("admin");
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (me) api<Data>("/api/admin/feedback").then(setData).catch(() => setData({ ups: 0, downs: 0, items: [] }));
  }, [me]);

  if (!me || !data) return <div className="loading"><span className="spinner" /></div>;
  const total = data.ups + data.downs;
  return (
    <div className="pg-feedback">
      <Topbar links={ADMIN_NAV("feedback")} signOut="admin" />
      <main>
        <PageTitle text="Feedback" />
        <p className="lead">What people said about their documents, newest first.</p>

        <Reveal mount delay={0.15}>
          <div className="tiles">
            <div className="card tile"><div className="label">Ratings</div><div className="value"><CountUp to={total} duration={1.2} /></div></div>
            <div className="card tile">
              <div className="label">👍 Useful</div>
              <div className="value">
                <CountUp to={data.ups} duration={1.2} />
                {total > 0 && <span className="muted" style={{ fontSize: 18, fontWeight: 500 }}> · {Math.round((100 * data.ups) / total)}%</span>}
              </div>
            </div>
            <div className="card tile"><div className="label">👎 Not useful</div><div className="value"><CountUp to={data.downs} duration={1.2} /></div></div>
          </div>

          <div className="card">
            {data.items.length === 0 ? (
              <div className="empty">No feedback yet. It shows up here when someone rates a document.</div>
            ) : (
              data.items.map((i) => (
                <div className="item" key={i.id}>
                  <div className="item-head">
                    <span className="r" aria-label={i.rating === 1 ? "Useful" : "Not useful"}>{i.rating === 1 ? "👍" : "👎"}</span>
                    <Link href={"/admin/documents/" + i.id}>{i.title}</Link>
                    <span className="meta">{i.org_name || "Deleted org"} · {i.when}</span>
                  </div>
                  {i.feedback ? <p className="comment">{i.feedback}</p> : <p className="nocomment">No comment.</p>}
                </div>
              ))
            )}
          </div>
        </Reveal>
      </main>
    </div>
  );
}

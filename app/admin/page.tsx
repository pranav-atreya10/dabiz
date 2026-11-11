"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Topbar, { ADMIN_NAV } from "@/components/Topbar";
import { PageTitle, Pull, Reveal } from "@/components/Motion";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import "@/app/styles/admin.css";

type Org = {
  id: number; name: string; azdo_org_url: string; azdo_project: string;
  azdo_story_type: string; has_pat: boolean; connected: boolean;
};
type Flash = { kind: "ok" | "error"; text: string } | { kind: "code"; name: string; code: string };

const STORY_TYPES = ["User Story", "Product Backlog Item", "Issue", "Requirement"];

function OrgCard({ org, onChange, onFlash }: { org: Org; onChange: () => void; onFlash: (f: Flash) => void }) {
  const [url, setUrl] = useState(org.azdo_org_url);
  const [project, setProject] = useState(org.azdo_project);
  const [type, setType] = useState(org.azdo_story_type);
  const [pat, setPat] = useState("");
  const [clear, setClear] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/admin/orgs/${org.id}/devops`, "POST", { org_url: url, project, story_type: type, pat, clear_pat: clear });
      setPat("");
      setClear(false);
      onFlash({ kind: "ok", text: "Azure DevOps settings saved." });
      onChange();
    } catch (err) {
      onFlash({ kind: "error", text: (err as Error).message });
    }
  };
  const newCode = async () => {
    if (!confirm(`Make a new code for ${org.name}? The old code stops working and everyone using it is signed out.`)) return;
    try {
      const d = await api<{ name: string; code: string }>(`/api/admin/orgs/${org.id}/code`, "POST");
      onFlash({ kind: "code", name: d.name, code: d.code });
    } catch (err) {
      onFlash({ kind: "error", text: (err as Error).message });
    }
  };
  const remove = async () => {
    if (!confirm(`Delete ${org.name}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/orgs/${org.id}`, "DELETE");
      onFlash({ kind: "ok", text: `Deleted ${org.name} and its documents. Anyone signed in with its code is signed out.` });
      onChange();
    } catch (err) {
      onFlash({ kind: "error", text: (err as Error).message });
    }
  };

  return (
    <section className="card">
      <div className="org-head">
        <h2>{org.name}</h2>
        <span className={"status" + (org.connected ? " on" : "")}>{org.connected ? "Azure DevOps connected" : "Azure DevOps not set up"}</span>
      </div>

      <details>
        <summary>Azure DevOps settings</summary>
        <form onSubmit={save}>
          <div className="grid">
            <div>
              <label htmlFor={`url-${org.id}`}>Org URL</label>
              <input id={`url-${org.id}`} type="url" placeholder="https://dev.azure.com/their-org" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div>
              <label htmlFor={`proj-${org.id}`}>Project</label>
              <input id={`proj-${org.id}`} type="text" placeholder="Project name" value={project} onChange={(e) => setProject(e.target.value)} />
            </div>
          </div>
          <label htmlFor={`type-${org.id}`}>Story type</label>
          <select id={`type-${org.id}`} value={type} onChange={(e) => setType(e.target.value)}>
            {STORY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <p className="hintline">Agile projects use User Story, Scrum uses Product Backlog Item, Basic uses Issue, CMMI uses Requirement.</p>
          <label htmlFor={`pat-${org.id}`}>Access token</label>
          <input
            id={`pat-${org.id}`} type="password" autoComplete="new-password" value={pat} onChange={(e) => setPat(e.target.value)}
            placeholder={org.has_pat ? "Saved. Leave blank to keep it" : "Personal Access Token with Work Items: Read & write"}
          />
          {org.has_pat && (
            <label className="check"><input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} /> Remove the saved token</label>
          )}
          <p className="hintline">Tokens are stored encrypted and never shown again.</p>
          <div className="row-actions"><button className="btn btn-secondary btn-sm" type="submit">Save settings</button></div>
        </form>
      </details>

      <div className="row-actions">
        <button className="btn btn-outline btn-sm" type="button" onClick={newCode}>New sign-in code</button>
        <button className="btn btn-danger btn-sm" type="button" onClick={remove}>Delete org</button>
      </div>
    </section>
  );
}

export default function AdminPage() {
  const me = useMe("admin");
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    api<{ orgs: Org[] }>("/api/admin/orgs").then((d) => setOrgs(d.orgs)).catch(() => setOrgs([]));
  }, []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const show = (f: Flash) => {
    setFlash(f);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const d = await api<{ name: string; code: string }>("/api/admin/orgs", "POST", { name });
      setName("");
      show({ kind: "code", name: d.name, code: d.code });
      load();
    } catch (err) {
      show({ kind: "error", text: (err as Error).message });
    }
  };

  if (!me) return <div className="loading"><span className="spinner" /></div>;
  return (
    <div className="pg-admin">
      <Topbar links={ADMIN_NAV("orgs")} tag="Admin" signOut="admin" />
      <main>
        <PageTitle text="Organizations" />
        <p className="lead">Each org signs in with its own code and sends to its own Azure DevOps.</p>

        {flash?.kind === "code" && (
          <div className="newcode">
            <div className="muted">Sign-in code for <strong style={{ color: "var(--text)" }}>{flash.name}</strong></div>
            <div className="code">{flash.code}</div>
            <button
              className="btn btn-primary btn-sm" type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(flash.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy code"}
            </button>
            <p className="warn">Save it now. For safety, it&apos;s only shown this once. You can always make a new one.</p>
          </div>
        )}
        {flash && flash.kind !== "code" && <div className={"flash " + flash.kind}>{flash.text}</div>}

        <Reveal mount delay={0.15}>
          <form className="card" onSubmit={create}>
            <h2>Add an org</h2>
            <p className="muted" style={{ margin: 0 }}>You&apos;ll get a sign-in code to give to that org.</p>
            <label htmlFor="name">Org name</label>
            <div className="inline">
              <input id="name" type="text" placeholder="e.g. Contoso" maxLength={120} required value={name} onChange={(e) => setName(e.target.value)} />
              <Pull><button className="btn btn-primary" type="submit">Create org <span className="arrow">→</span></button></Pull>
            </div>
          </form>

          {orgs === null ? null : orgs.length === 0 ? (
            <div className="card empty">No orgs yet. Add one above to get its sign-in code.</div>
          ) : (
            orgs.map((org) => <OrgCard key={org.id} org={org} onChange={load} onFlash={show} />)
          )}
        </Reveal>
      </main>
    </div>
  );
}

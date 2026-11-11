"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Topbar, { ADMIN_NAV, ORG_NAV } from "@/components/Topbar";
import { PageTitle, Reveal } from "@/components/Motion";
import CountUp from "@/components/reactbits/CountUp";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import "@/app/styles/usage.css";

type Day = { day: string; tokens: number; input: number; output: number; cost: number };
type Row = { name?: string; label?: string; tokens: number; cost: number; calls: number };
type Usage = {
  days: number;
  total: { tokens: number; input: number; output: number; cost: number; calls: number };
  prices: { input: number; output: number };
  by_day: Day[];
  by_feature: Row[];
  by_org: Row[];
};

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");
const money = (n: number) => (n >= 100 ? "$" + full.format(Math.round(n)) : "$" + n.toFixed(n < 1 ? 4 : 2));
const dayLabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Bar chart of tokens per day, with a tooltip on hover or tap. */
function Chart({ rows, priced }: { rows: Day[]; priced: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  const [hot, setHot] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth || 600);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 260;
  const pad = { l: 44, r: 4, t: 8, b: 28 };
  const n = rows.length || 1;
  const max = niceMax(Math.max(0, ...rows.map((d) => d.tokens)));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / n;
  const gap = Math.max(2, slot * 0.25);
  const bw = Math.max(2, slot - gap);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const every = Math.ceil(n / (W < 500 ? 4 : 7));
  const tipDay = hot !== null ? rows[hot] : null;
  const tipX = hot !== null ? Math.min(Math.max(pad.l + hot * slot + slot / 2, 80), W - 80) : 0;

  return (
    <div className="chart" ref={wrap}>
      <svg role="img" aria-label="Tokens per day" viewBox={`0 0 ${W} ${H}`} onPointerLeave={() => setHot(null)}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max / 4) * i;
          return (
            <g key={i}>
              <line className="gridline" x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />
              <text className="axis" x={pad.l - 8} y={y(v) + 4} textAnchor="end">{compact.format(v)}</text>
            </g>
          );
        })}
        {rows.map((d, i) => {
          const x = pad.l + i * slot + gap / 2;
          const h = (d.tokens / max) * ih;
          const r = Math.min(4, h, bw / 2);
          const top = y(d.tokens);
          const base = pad.t + ih;
          return (
            <g key={d.day}>
              {h > 0 && (
                <path
                  className={"bar" + (hot === i ? " hot" : "")}
                  d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`}
                />
              )}
              {(n - 1 - i) % every === 0 && (
                <text className="axis" x={x + bw / 2} y={H - 8} textAnchor="middle">{dayLabel(d.day)}</text>
              )}
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" onPointerEnter={() => setHot(i)} onPointerDown={() => setHot(i)} />
            </g>
          );
        })}
      </svg>
      <div className={"tip" + (tipDay ? " show" : "")} style={tipDay ? { left: tipX, top: y(tipDay.tokens) } : undefined}>
        {tipDay && (
          <>
            <b>{dayLabel(tipDay.day)}</b><br />
            {full.format(tipDay.tokens)} tokens<br />
            {full.format(tipDay.input)} in · {full.format(tipDay.output)} out
            {priced && <><br />{money(tipDay.cost)}</>}
          </>
        )}
      </div>
    </div>
  );
}

function Rows({ rows, priced }: { rows: Row[]; priced: boolean }) {
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>Nothing yet.</p>;
  const max = Math.max(...rows.map((r) => r.tokens), 1);
  return (
    <div className="rows">
      {[...rows].sort((a, b) => b.tokens - a.tokens).map((r, i) => {
        const name = r.name || r.label || "Unknown";
        return (
          <div className="hrow" key={name + i}>
            <div className="name" title={name}>{name}</div>
            <div className="track"><div className="fill" style={{ width: (r.tokens / max) * 100 + "%" }} /></div>
            <div className="num">
              {full.format(r.tokens)}
              <span>{priced ? money(r.cost) : r.calls + (r.calls === 1 ? " call" : " calls")}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The usage page. Orgs see their own numbers; the admin sees every org and sets prices. */
export default function UsageView({ admin }: { admin: boolean }) {
  const me = useMe(admin ? "admin" : "org");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [table, setTable] = useState(false);
  const [pin, setPin] = useState("");
  const [pout, setPout] = useState("");
  const [priceMsg, setPriceMsg] = useState("");

  const load = useCallback(() => {
    api<Usage>((admin ? "/api/admin/usage" : "/api/usage") + "?days=" + days)
      .then((d) => {
        setData(d);
        setError("");
        if (d.prices.input > 0 || d.prices.output > 0) {
          setPin(String(d.prices.input));
          setPout(String(d.prices.output));
        }
      })
      .catch((e) => setError(e.message || "Couldn't load usage."));
  }, [admin, days]);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const savePrices = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/usage/prices", "POST", { input: pin, output: pout });
      setPriceMsg("Saved.");
      load();
    } catch (err) {
      setPriceMsg((err as Error).message);
    }
  };

  if (!me) return <div className="loading"><span className="spinner" /></div>;
  const t = data?.total;
  const priced = !!data && (data.prices.input > 0 || data.prices.output > 0);
  return (
    <div className="pg-usage">
      <Topbar links={admin ? ADMIN_NAV("usage") : ORG_NAV("usage")} signOut={admin ? "admin" : "org"} />
      <main>
        <PageTitle text="Usage" />
        <p className="lead">AI tokens used by {admin ? "all orgs" : me.org?.name}. Every question, document and Azure DevOps send counts.</p>

        <div className="seg" role="tablist" aria-label="Time range">
          {[7, 30, 90].map((d) => (
            <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>{d} days</button>
          ))}
        </div>

        <Reveal mount delay={0.15}>
          <div className="tiles">
            <div className="card tile">
              <div className="label">Tokens used</div>
              <div className="value">{t ? <CountUp key={days} to={t.tokens} duration={1.2} format="compact" /> : "–"}</div>
              <div className="sub">{t ? `${full.format(t.input)} in · ${full.format(t.output)} out` : ""}</div>
            </div>
            <div className="card tile">
              <div className="label">Estimated cost</div>
              <div className="value">{t && priced ? money(t.cost) : admin && data ? <a href="#pin">Set prices</a> : "–"}</div>
              <div className="sub">
                {!data ? "" : priced ? `Last ${data.days} days` : admin ? "Add prices below to see cost" : "Your admin hasn't set prices yet"}
              </div>
            </div>
            <div className="card tile">
              <div className="label">AI calls</div>
              <div className="value">{t ? <CountUp key={days} to={t.calls} duration={1.2} separator="," /> : "–"}</div>
              <div className="sub">{t ? (t.calls ? compact.format(Math.round(t.tokens / t.calls)) + " tokens per call" : "No calls yet") : ""}</div>
            </div>
          </div>

          <section className="card block">
            <div className="block-head">
              <h2>Tokens per day</h2>
              <button className="linkish" onClick={() => setTable(!table)}>{table ? "Show as chart" : "Show as table"}</button>
            </div>
            {error ? (
              <p className="empty">{error}</p>
            ) : !data ? (
              <p className="empty">Loading…</p>
            ) : table ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Day</th><th>Input</th><th>Output</th><th>Total</th>{priced && <th>Cost</th>}</tr></thead>
                  <tbody>
                    {[...data.by_day].reverse().map((d) => (
                      <tr key={d.day}>
                        <td>{dayLabel(d.day)}</td><td>{full.format(d.input)}</td><td>{full.format(d.output)}</td><td>{full.format(d.tokens)}</td>
                        {priced && <td>{money(d.cost)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Chart rows={data.by_day} priced={priced} />
            )}
          </section>

          {admin && (
            <section className="card block">
              <div className="block-head"><h2>By organization</h2></div>
              <Rows rows={(data?.by_org || []).map((o) => ({ ...o, name: o.name || "Unknown org" }))} priced={priced} />
            </section>
          )}

          <section className="card block">
            <div className="block-head"><h2>By feature</h2></div>
            <Rows rows={(data?.by_feature || []).map((f) => ({ ...f, name: f.label }))} priced={priced} />
          </section>

          <section className="card block">
            <div className="block-head"><h2>Prices</h2></div>
            {admin ? (
              <>
                <form className="prices" onSubmit={savePrices}>
                  <div><label htmlFor="pin">Input, $ per 1M tokens</label><input id="pin" type="text" inputMode="decimal" placeholder="e.g. 1.25" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
                  <div><label htmlFor="pout">Output, $ per 1M tokens</label><input id="pout" type="text" inputMode="decimal" placeholder="e.g. 10" value={pout} onChange={(e) => setPout(e.target.value)} /></div>
                  <button className="btn btn-secondary" type="submit">Save prices</button>
                </form>
                <p className="note">{priceMsg ? priceMsg + " " : ""}Find your model&apos;s prices on OpenAI&apos;s pricing page. Costs here are estimates.</p>
              </>
            ) : (
              <>
                <p className="muted" style={{ margin: 0 }}>
                  {priced ? `$${data!.prices.input} per 1M input tokens · $${data!.prices.output} per 1M output tokens` : "No prices set yet."}
                </p>
                <p className="note">Your admin sets these. Costs here are estimates.</p>
              </>
            )}
          </section>
        </Reveal>
      </main>
    </div>
  );
}

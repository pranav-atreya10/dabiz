"""AI token tracking: one row per OpenAI call, plus summaries for the usage charts.

org_id is None for calls that don't belong to an org (the single-password version).
Prices are what the admin typed in, in dollars per million tokens, so costs are estimates.
"""

from datetime import datetime, timedelta, timezone

import db

FEATURES = {
    "questions": "Generate questions",
    "document": "Write document",
    "devops": "Send to Azure DevOps",
}


def record(org_id, feature, model, response):
    """Save the token counts from an OpenAI response. Never breaks the request if saving fails."""
    u = getattr(response, "usage", None)
    if u is None or not db.available():
        return
    try:
        db.query(
            "INSERT INTO usage (org_id, feature, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)",
            (org_id, feature, model, int(u.input_tokens or 0), int(u.output_tokens or 0)),
        )
    except Exception as e:  # tracking is best-effort; the user still gets their answer
        print(f"usage.record failed: {e}")


def prices():
    def num(key):
        try:
            return max(0.0, float(db.get_setting(key, "0") or 0))
        except ValueError:
            return 0.0

    return {"input": num("price_input_per_m"), "output": num("price_output_per_m")}


def set_prices(input_per_m, output_per_m):
    db.set_setting("price_input_per_m", str(input_per_m))
    db.set_setting("price_output_per_m", str(output_per_m))


def _cost(inp, out, p):
    return (inp * p["input"] + out * p["output"]) / 1_000_000


def summary(org_id=None, all_orgs=False, days=30):
    """Totals, tokens per day, per feature and (with all_orgs) per org, for the last `days` days."""
    since = (datetime.now(timezone.utc) - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    since_db = since.strftime("%Y-%m-%d %H:%M:%S")
    where, params = "created_at >= ?", [since_db]
    if not all_orgs:
        where += " AND org_id IS NULL" if org_id is None else " AND org_id = ?"
        if org_id is not None:
            params.append(org_id)

    rows = db.query(
        f"SELECT org_id, feature, input_tokens, output_tokens, created_at FROM usage WHERE {where}", params
    )
    p = prices()
    by_day = {(since + timedelta(days=i)).strftime("%Y-%m-%d"): {"input": 0, "output": 0} for i in range(days)}
    by_feature, by_org = {}, {}
    total_in = total_out = 0
    for r in rows:
        day = str(r["created_at"])[:10]
        inp, out = r["input_tokens"], r["output_tokens"]
        total_in, total_out = total_in + inp, total_out + out
        if day in by_day:
            by_day[day]["input"] += inp
            by_day[day]["output"] += out
        f = by_feature.setdefault(r["feature"], {"input": 0, "output": 0, "calls": 0})
        f["input"] += inp
        f["output"] += out
        f["calls"] += 1
        o = by_org.setdefault(r["org_id"], {"input": 0, "output": 0, "calls": 0})
        o["input"] += inp
        o["output"] += out
        o["calls"] += 1

    def finish(d):
        return {**d, "tokens": d["input"] + d["output"], "cost": round(_cost(d["input"], d["output"], p), 4)}

    return {
        "days": days,
        "prices": p,
        "total": finish({"input": total_in, "output": total_out, "calls": len(rows)}),
        "by_day": [{"day": k, **finish(v)} for k, v in by_day.items()],
        "by_feature": sorted(
            ({"key": k, "label": FEATURES.get(k, k), **finish(v)} for k, v in by_feature.items()),
            key=lambda x: -x["tokens"],
        ),
        "by_org": [{"org_id": k, **finish(v)} for k, v in by_org.items()],
    }

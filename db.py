"""Storage. Uses Postgres when DATABASE_URL is set, otherwise a local SQLite file.

SQLite is only for running on your own computer. On Vercel the disk is wiped between
requests, so without DATABASE_URL storage is turned off there (see `available()`).
"""

import os
import sqlite3
from contextlib import contextmanager

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SQLITE_PATH = os.environ.get("SQLITE_PATH", "app.db")

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS usage (
        id {id_type},
        org_id INTEGER,
        feature TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
    "CREATE INDEX IF NOT EXISTS usage_org_time ON usage (org_id, created_at)",
    """CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )""",
]


def available():
    """False on Vercel without DATABASE_URL, where a SQLite file wouldn't survive."""
    return bool(DATABASE_URL) or not os.environ.get("VERCEL")


@contextmanager
def connect():
    if DATABASE_URL:
        import psycopg
        from psycopg.rows import dict_row

        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            yield conn, "%s"
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn, "?"
            conn.commit()
        finally:
            conn.close()


def query(sql, params=(), one=False):
    """Run SQL written with ? placeholders on either database. Returns dict rows."""
    with connect() as (conn, mark):
        cur = conn.execute(sql.replace("?", mark), params)
        rows = [dict(r) for r in cur.fetchall()] if cur.description else []
    return (rows[0] if rows else None) if one else rows


def init():
    id_type = "SERIAL PRIMARY KEY" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT"
    for statement in SCHEMA:
        query(statement.format(id_type=id_type))


def get_setting(key, default=""):
    row = query("SELECT value FROM settings WHERE key = ?", (key,), one=True)
    return row["value"] if row else default


def set_setting(key, value):
    query("DELETE FROM settings WHERE key = ?", (key,))
    query("INSERT INTO settings (key, value) VALUES (?, ?)", (key, value))

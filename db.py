"""Storage for orgs, usage and settings. Uses Postgres when DATABASE_URL is set,
otherwise a local SQLite file.

SQLite is only for running on your own computer. On Vercel the disk is wiped between
requests, so without DATABASE_URL storage is turned off there (see `available()`).
"""

import base64
import hashlib
import os
import secrets
import sqlite3
from contextlib import contextmanager

from cryptography.fernet import Fernet, InvalidToken

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SQLITE_PATH = os.environ.get("SQLITE_PATH", "app.db")

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS orgs (
        id {id_type},
        name TEXT NOT NULL,
        code_hash TEXT NOT NULL UNIQUE,
        code_version INTEGER NOT NULL DEFAULT 1,
        azdo_org_url TEXT NOT NULL DEFAULT '',
        azdo_project TEXT NOT NULL DEFAULT '',
        azdo_pat_encrypted TEXT NOT NULL DEFAULT '',
        azdo_story_type TEXT NOT NULL DEFAULT 'User Story',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
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
    """CREATE TABLE IF NOT EXISTS documents (
        id {id_type},
        org_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        idea TEXT NOT NULL,
        qa TEXT NOT NULL DEFAULT '[]',
        content TEXT NOT NULL,
        rating INTEGER,
        feedback TEXT NOT NULL DEFAULT '',
        feedback_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
    "CREATE INDEX IF NOT EXISTS documents_org ON documents (org_id, updated_at)",
    """CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )""",
]

COLUMNS = "id, name, code_version, azdo_org_url, azdo_project, azdo_pat_encrypted, azdo_story_type, created_at"


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


# ---------- Org codes ----------
# Codes are random and long (about 60 bits), so a plain SHA-256 is enough to store them
# safely and they can't realistically be guessed.

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I mix-ups


def new_code():
    raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(12))
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


def hash_code(code):
    cleaned = "".join(ch for ch in code.upper() if ch.isalnum())
    return hashlib.sha256(cleaned.encode()).hexdigest()


# ---------- Encrypting Azure DevOps tokens ----------

def _fernet():
    """Tokens are encrypted with a key made from SECRET_KEY, so a leaked database alone doesn't expose them."""
    key = os.environ.get("SECRET_KEY", "")
    if not key:
        raise RuntimeError("SECRET_KEY isn't set.")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"azdo-pat:{key}".encode()).digest()))


def encrypt(text):
    return _fernet().encrypt(text.encode()).decode() if text else ""


def decrypt(token):
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return ""


# ---------- Org operations ----------

def list_orgs():
    return query(f"SELECT {COLUMNS} FROM orgs ORDER BY name")


def get_org(org_id):
    return query(f"SELECT {COLUMNS} FROM orgs WHERE id = ?", (org_id,), one=True)


def find_org_by_code(code):
    return query(f"SELECT {COLUMNS} FROM orgs WHERE code_hash = ?", (hash_code(code),), one=True)


def create_org(name):
    """Create an org and return (org_id, code). The code is only ever shown this once."""
    code = new_code()
    row = query("INSERT INTO orgs (name, code_hash) VALUES (?, ?) RETURNING id",
                (name, hash_code(code)), one=True)
    return row["id"], code


def regenerate_code(org_id):
    """Replace an org's code. Everyone signed in with the old code gets signed out."""
    code = new_code()
    query("UPDATE orgs SET code_hash = ?, code_version = code_version + 1 WHERE id = ?",
          (hash_code(code), org_id))
    return code


def update_devops(org_id, org_url, project, story_type, pat=None):
    """Save an org's Azure DevOps settings. pat=None keeps the saved token; "" clears it."""
    query("UPDATE orgs SET azdo_org_url = ?, azdo_project = ?, azdo_story_type = ? WHERE id = ?",
          (org_url.strip().rstrip("/"), project.strip(), story_type.strip() or "User Story", org_id))
    if pat is not None:
        query("UPDATE orgs SET azdo_pat_encrypted = ? WHERE id = ?", (encrypt(pat.strip()), org_id))


def delete_org(org_id):
    """Delete an org and its documents. Its usage history is kept (it shows up as a deleted org)."""
    query("DELETE FROM documents WHERE org_id = ?", (org_id,))
    query("DELETE FROM orgs WHERE id = ?", (org_id,))


# ---------- Documents ----------
# Every document belongs to one org, and every lookup checks the org, so orgs can't see
# each other's documents.

DOC_LIST_COLUMNS = "id, title, rating, created_at, updated_at"


def title_from(content, fallback="Untitled document"):
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()[:200] or fallback
    return fallback


def create_document(org_id, idea, qa_json, content):
    row = query(
        "INSERT INTO documents (org_id, title, idea, qa, content) VALUES (?, ?, ?, ?, ?) RETURNING id",
        (org_id, title_from(content), idea, qa_json, content), one=True,
    )
    return row["id"]


def list_documents(org_id):
    return query(f"SELECT {DOC_LIST_COLUMNS} FROM documents WHERE org_id = ? ORDER BY updated_at DESC, id DESC",
                 (org_id,))


def get_document(org_id, doc_id):
    return query("SELECT * FROM documents WHERE id = ? AND org_id = ?", (doc_id, org_id), one=True)


def update_document(org_id, doc_id, content):
    query("UPDATE documents SET content = ?, title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?",
          (content, title_from(content), doc_id, org_id))


def delete_document(org_id, doc_id):
    query("DELETE FROM documents WHERE id = ? AND org_id = ?", (doc_id, org_id))


def set_feedback(org_id, doc_id, rating, comment):
    query("UPDATE documents SET rating = ?, feedback = ?, feedback_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?",
          (rating, comment, doc_id, org_id))


def all_feedback():
    """Every rated document, newest first, with its org's name (for the admin)."""
    return query(
        "SELECT d.id, d.title, d.rating, d.feedback, d.feedback_at, o.name AS org_name "
        "FROM documents d LEFT JOIN orgs o ON o.id = d.org_id "
        "WHERE d.rating IS NOT NULL ORDER BY d.feedback_at DESC"
    )


def get_document_any_org(doc_id):
    """For the admin only."""
    return query("SELECT d.*, o.name AS org_name FROM documents d LEFT JOIN orgs o ON o.id = d.org_id WHERE d.id = ?",
                 (doc_id,), one=True)

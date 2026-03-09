"""
ClaudeOS Memory Service (mem0)

A FastAPI-based memory storage and retrieval service using SQLite.
Provides CRUD operations for memories and a graph edge system for
relating memories to each other.

Search uses difflib.SequenceMatcher for text similarity scoring,
giving functional fuzzy search without requiring vector embeddings.
"""

import json
import os
import sqlite3
import threading
import uuid
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from difflib import SequenceMatcher
from math import log, sqrt
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = os.environ.get("DATA_DIR", "/data")
DB_DIR = os.path.join(DATA_DIR, "memories")
DB_PATH = os.path.join(DB_DIR, "mem0.db")

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

_local = threading.local()


def _get_connection() -> sqlite3.Connection:
    """Return a thread-local SQLite connection."""
    conn = getattr(_local, "connection", None)
    if conn is None:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.connection = conn
    return conn


@contextmanager
def get_db():
    """Context manager yielding a SQLite connection."""
    conn = _get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def init_db() -> None:
    """Create tables if they do not exist."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                user_id TEXT NOT NULL DEFAULT 'global',
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS graph_edges (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                relation TEXT NOT NULL,
                user_id TEXT NOT NULL DEFAULT 'global',
                created_at TEXT NOT NULL,
                FOREIGN KEY (source_id) REFERENCES memories(id) ON DELETE CASCADE,
                FOREIGN KEY (target_id) REFERENCES memories(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_graph_edges_user ON graph_edges(user_id)"
        )


# ---------------------------------------------------------------------------
# Search helpers: TF-IDF-like scoring with SequenceMatcher fallback
# ---------------------------------------------------------------------------


def _tokenize(text: str) -> list[str]:
    """Simple whitespace + lowercase tokenizer."""
    return text.lower().split()


def _tf(tokens: list[str]) -> dict[str, float]:
    """Term frequency: count / total."""
    counter = Counter(tokens)
    total = len(tokens)
    if total == 0:
        return {}
    return {t: c / total for t, c in counter.items()}


def _compute_idf(corpus_tokens: list[list[str]]) -> dict[str, float]:
    """Inverse document frequency across the corpus."""
    n = len(corpus_tokens)
    if n == 0:
        return {}
    df: dict[str, int] = {}
    for tokens in corpus_tokens:
        unique = set(tokens)
        for t in unique:
            df[t] = df.get(t, 0) + 1
    return {t: log((n + 1) / (count + 1)) + 1 for t, count in df.items()}


def _tfidf_vector(
    tokens: list[str], idf: dict[str, float]
) -> dict[str, float]:
    """Build a TF-IDF vector for a token list."""
    tf = _tf(tokens)
    return {t: tf_val * idf.get(t, 1.0) for t, tf_val in tf.items()}


def _cosine_similarity(
    vec_a: dict[str, float], vec_b: dict[str, float]
) -> float:
    """Cosine similarity between two sparse vectors."""
    all_keys = set(vec_a) | set(vec_b)
    if not all_keys:
        return 0.0
    dot = sum(vec_a.get(k, 0.0) * vec_b.get(k, 0.0) for k in all_keys)
    mag_a = sqrt(sum(v * v for v in vec_a.values()))
    mag_b = sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def search_memories(
    query: str, memories: list[dict], limit: int = 10
) -> list[dict]:
    """
    Search memories using a combined TF-IDF cosine similarity and
    SequenceMatcher ratio. Returns top `limit` results sorted by score.
    """
    if not memories or not query.strip():
        return []

    query_tokens = _tokenize(query)
    corpus_tokens = [_tokenize(m["text"]) for m in memories]
    idf = _compute_idf(corpus_tokens + [query_tokens])
    query_vec = _tfidf_vector(query_tokens, idf)

    scored: list[tuple[float, dict]] = []
    for mem, tokens in zip(memories, corpus_tokens):
        mem_vec = _tfidf_vector(tokens, idf)
        tfidf_score = _cosine_similarity(query_vec, mem_vec)

        # SequenceMatcher fallback for substring / fuzzy matching
        seq_score = SequenceMatcher(
            None, query.lower(), mem["text"].lower()
        ).ratio()

        # Weighted combination: TF-IDF primary, SequenceMatcher secondary
        combined = 0.7 * tfidf_score + 0.3 * seq_score
        if combined > 0.01:
            scored.append((combined, mem))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, mem in scored[:limit]:
        result = dict(mem)
        result["score"] = round(score, 4)
        results.append(result)
    return results


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AddMemoryRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Memory content text")
    user_id: str = Field(default="global", description="Owner user ID")
    metadata: dict = Field(default_factory=dict, description="Arbitrary metadata JSON")


class AddEdgeRequest(BaseModel):
    source_id: str = Field(..., description="Source memory ID")
    target_id: str = Field(..., description="Target memory ID")
    relation: str = Field(..., min_length=1, description="Relation label")
    user_id: str = Field(default="global", description="Owner user ID")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query text")
    user_id: str = Field(default="global", description="User ID to scope search")
    limit: int = Field(default=10, ge=1, le=100, description="Max results")


class UpdateMemoryRequest(BaseModel):
    text: Optional[str] = Field(None, min_length=1)
    metadata: Optional[dict] = None


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ClaudeOS Memory Service",
    description="SQLite-backed memory storage with search and graph edges",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    """Health check returning status and total memory count."""
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) as cnt FROM memories").fetchone()
        count = row["cnt"] if row else 0
    return {"status": "ok", "count": count}


# ---------------------------------------------------------------------------
# Memories CRUD
# ---------------------------------------------------------------------------


@app.get("/all")
async def get_all_memories(user_id: str = Query(default="global")):
    """Return all memories for a given user_id."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    memories = []
    for row in rows:
        mem = dict(row)
        try:
            mem["metadata"] = json.loads(mem["metadata"])
        except (json.JSONDecodeError, TypeError):
            mem["metadata"] = {}
        memories.append(mem)
    return memories


@app.get("/get/{memory_id}")
async def get_memory(memory_id: str):
    """Get a single memory by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found")
    mem = dict(row)
    try:
        mem["metadata"] = json.loads(mem["metadata"])
    except (json.JSONDecodeError, TypeError):
        mem["metadata"] = {}
    return mem


@app.post("/add", status_code=201)
async def add_memory(req: AddMemoryRequest):
    """Add a new memory."""
    now = datetime.now(timezone.utc).isoformat()
    memory_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO memories (id, text, user_id, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                memory_id,
                req.text,
                req.user_id,
                json.dumps(req.metadata),
                now,
                now,
            ),
        )
    return {
        "id": memory_id,
        "text": req.text,
        "user_id": req.user_id,
        "metadata": req.metadata,
        "created_at": now,
        "updated_at": now,
    }


@app.put("/update/{memory_id}")
async def update_memory(memory_id: str, req: UpdateMemoryRequest):
    """Update an existing memory's text and/or metadata."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Memory not found")

        now = datetime.now(timezone.utc).isoformat()
        new_text = req.text if req.text is not None else existing["text"]
        new_metadata = (
            json.dumps(req.metadata)
            if req.metadata is not None
            else existing["metadata"]
        )

        conn.execute(
            """
            UPDATE memories SET text = ?, metadata = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_text, new_metadata, now, memory_id),
        )

    return {
        "id": memory_id,
        "text": new_text,
        "metadata": json.loads(new_metadata) if isinstance(new_metadata, str) else new_metadata,
        "updated_at": now,
    }


@app.delete("/delete/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a memory and its associated graph edges."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Memory not found")

        # Delete associated edges (CASCADE should handle this but be explicit)
        conn.execute(
            "DELETE FROM graph_edges WHERE source_id = ? OR target_id = ?",
            (memory_id, memory_id),
        )
        conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))

    return {"deleted": True, "id": memory_id}


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


@app.post("/search")
async def search(req: SearchRequest):
    """Search memories using TF-IDF + SequenceMatcher similarity."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM memories WHERE user_id = ?", (req.user_id,)
        ).fetchall()

    memories = []
    for row in rows:
        mem = dict(row)
        try:
            mem["metadata"] = json.loads(mem["metadata"])
        except (json.JSONDecodeError, TypeError):
            mem["metadata"] = {}
        memories.append(mem)

    results = search_memories(req.query, memories, limit=req.limit)
    return results


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------


@app.get("/graph")
async def get_graph(user_id: str = Query(default="global")):
    """
    Return graph data: nodes (memories) and edges (relations).

    Nodes include id, text (label), and metadata.
    Edges include source, target, and relation.
    """
    with get_db() as conn:
        memory_rows = conn.execute(
            "SELECT * FROM memories WHERE user_id = ?", (user_id,)
        ).fetchall()
        edge_rows = conn.execute(
            "SELECT * FROM graph_edges WHERE user_id = ?", (user_id,)
        ).fetchall()

    nodes = []
    for row in memory_rows:
        mem = dict(row)
        try:
            mem["metadata"] = json.loads(mem["metadata"])
        except (json.JSONDecodeError, TypeError):
            mem["metadata"] = {}
        nodes.append(
            {
                "id": mem["id"],
                "text": mem["text"],
                "user_id": mem["user_id"],
                "metadata": mem["metadata"],
                "created_at": mem["created_at"],
            }
        )

    edges = []
    for row in edge_rows:
        edge = dict(row)
        edges.append(
            {
                "id": edge["id"],
                "source": edge["source_id"],
                "target": edge["target_id"],
                "relation": edge["relation"],
            }
        )

    return {"nodes": nodes, "edges": edges}


@app.post("/graph/edge", status_code=201)
async def add_edge(req: AddEdgeRequest):
    """Add a graph edge between two memories."""
    with get_db() as conn:
        # Verify both memories exist
        source = conn.execute(
            "SELECT id FROM memories WHERE id = ?", (req.source_id,)
        ).fetchone()
        target = conn.execute(
            "SELECT id FROM memories WHERE id = ?", (req.target_id,)
        ).fetchone()
        if not source:
            raise HTTPException(
                status_code=404, detail=f"Source memory {req.source_id} not found"
            )
        if not target:
            raise HTTPException(
                status_code=404, detail=f"Target memory {req.target_id} not found"
            )

        edge_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO graph_edges (id, source_id, target_id, relation, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (edge_id, req.source_id, req.target_id, req.relation, req.user_id, now),
        )

    return {
        "id": edge_id,
        "source_id": req.source_id,
        "target_id": req.target_id,
        "relation": req.relation,
        "user_id": req.user_id,
        "created_at": now,
    }


@app.delete("/graph/edge/{edge_id}")
async def delete_edge(edge_id: str):
    """Delete a graph edge by ID."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM graph_edges WHERE id = ?", (edge_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Edge not found")
        conn.execute("DELETE FROM graph_edges WHERE id = ?", (edge_id,))
    return {"deleted": True, "id": edge_id}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8100, log_level="info")

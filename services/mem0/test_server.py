"""
Comprehensive tests for the ClaudeOS Memory Service.

Uses pytest + httpx with FastAPI's TestClient pattern.
Tests cover all CRUD operations, search, graph edges,
error handling, and edge cases.
"""

import json
import os
import sqlite3
import tempfile

import pytest
from fastapi.testclient import TestClient

# Override DATA_DIR before importing server so we use a temp directory
_tmpdir = tempfile.mkdtemp()
os.environ["DATA_DIR"] = _tmpdir

from server import app, init_db, search_memories, DB_PATH


@pytest.fixture(autouse=True)
def reset_db():
    """Reset the database before each test."""
    # Remove existing DB file if present
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    # Re-initialize
    init_db()
    yield
    # Cleanup after test
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


# -----------------------------------------------------------------------
# Health check
# -----------------------------------------------------------------------


class TestHealth:
    def test_health_empty_db(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["count"] == 0

    def test_health_with_memories(self, client: TestClient):
        # Add a memory first
        client.post("/add", json={"text": "hello world"})
        resp = client.get("/health")
        data = resp.json()
        assert data["status"] == "ok"
        assert data["count"] == 1


# -----------------------------------------------------------------------
# Add memory
# -----------------------------------------------------------------------


class TestAddMemory:
    def test_add_basic(self, client: TestClient):
        resp = client.post("/add", json={"text": "Test memory"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == "Test memory"
        assert data["user_id"] == "global"
        assert data["metadata"] == {}
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_add_with_user_id(self, client: TestClient):
        resp = client.post(
            "/add", json={"text": "User memory", "user_id": "user-42"}
        )
        assert resp.status_code == 201
        assert resp.json()["user_id"] == "user-42"

    def test_add_with_metadata(self, client: TestClient):
        metadata = {"source": "test", "tags": ["a", "b"], "priority": 5}
        resp = client.post(
            "/add", json={"text": "Meta memory", "metadata": metadata}
        )
        assert resp.status_code == 201
        assert resp.json()["metadata"] == metadata

    def test_add_empty_text_rejected(self, client: TestClient):
        resp = client.post("/add", json={"text": ""})
        assert resp.status_code == 422

    def test_add_missing_text_rejected(self, client: TestClient):
        resp = client.post("/add", json={})
        assert resp.status_code == 422

    def test_add_multiple_memories(self, client: TestClient):
        for i in range(5):
            resp = client.post("/add", json={"text": f"Memory {i}"})
            assert resp.status_code == 201
        health = client.get("/health").json()
        assert health["count"] == 5


# -----------------------------------------------------------------------
# Get all memories
# -----------------------------------------------------------------------


class TestGetAllMemories:
    def test_get_all_empty(self, client: TestClient):
        resp = client.get("/all")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_all_default_user(self, client: TestClient):
        client.post("/add", json={"text": "Global mem 1"})
        client.post("/add", json={"text": "Global mem 2"})
        resp = client.get("/all")
        assert len(resp.json()) == 2

    def test_get_all_specific_user(self, client: TestClient):
        client.post("/add", json={"text": "Global", "user_id": "global"})
        client.post("/add", json={"text": "Alice", "user_id": "alice"})
        client.post("/add", json={"text": "Alice 2", "user_id": "alice"})

        global_mems = client.get("/all?user_id=global").json()
        alice_mems = client.get("/all?user_id=alice").json()
        assert len(global_mems) == 1
        assert len(alice_mems) == 2

    def test_get_all_ordered_by_created_desc(self, client: TestClient):
        client.post("/add", json={"text": "First"})
        client.post("/add", json={"text": "Second"})
        client.post("/add", json={"text": "Third"})
        mems = client.get("/all").json()
        assert mems[0]["text"] == "Third"
        assert mems[2]["text"] == "First"


# -----------------------------------------------------------------------
# Get single memory
# -----------------------------------------------------------------------


class TestGetMemory:
    def test_get_existing(self, client: TestClient):
        added = client.post("/add", json={"text": "Findable"}).json()
        resp = client.get(f"/get/{added['id']}")
        assert resp.status_code == 200
        assert resp.json()["text"] == "Findable"

    def test_get_nonexistent(self, client: TestClient):
        resp = client.get("/get/nonexistent-id")
        assert resp.status_code == 404


# -----------------------------------------------------------------------
# Update memory
# -----------------------------------------------------------------------


class TestUpdateMemory:
    def test_update_text(self, client: TestClient):
        added = client.post("/add", json={"text": "Original"}).json()
        resp = client.put(
            f"/update/{added['id']}", json={"text": "Updated"}
        )
        assert resp.status_code == 200
        assert resp.json()["text"] == "Updated"

    def test_update_metadata(self, client: TestClient):
        added = client.post(
            "/add", json={"text": "Meta", "metadata": {"v": 1}}
        ).json()
        resp = client.put(
            f"/update/{added['id']}", json={"metadata": {"v": 2, "extra": True}}
        )
        assert resp.status_code == 200
        assert resp.json()["metadata"] == {"v": 2, "extra": True}

    def test_update_preserves_unchanged_fields(self, client: TestClient):
        added = client.post(
            "/add", json={"text": "Keep me", "metadata": {"keep": True}}
        ).json()
        # Only update metadata, text should stay
        resp = client.put(
            f"/update/{added['id']}", json={"metadata": {"new": "val"}}
        )
        assert resp.json()["text"] == "Keep me"

    def test_update_nonexistent(self, client: TestClient):
        resp = client.put("/update/fake-id", json={"text": "nope"})
        assert resp.status_code == 404


# -----------------------------------------------------------------------
# Delete memory
# -----------------------------------------------------------------------


class TestDeleteMemory:
    def test_delete_existing(self, client: TestClient):
        added = client.post("/add", json={"text": "Deletable"}).json()
        resp = client.delete(f"/delete/{added['id']}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

        # Verify it's gone
        get_resp = client.get(f"/get/{added['id']}")
        assert get_resp.status_code == 404

    def test_delete_nonexistent(self, client: TestClient):
        resp = client.delete("/delete/nonexistent")
        assert resp.status_code == 404

    def test_delete_cascades_edges(self, client: TestClient):
        m1 = client.post("/add", json={"text": "Node A"}).json()
        m2 = client.post("/add", json={"text": "Node B"}).json()
        edge = client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": m2["id"],
                "relation": "related_to",
            },
        ).json()

        # Delete source, edge should be gone
        client.delete(f"/delete/{m1['id']}")
        graph = client.get("/graph").json()
        assert len(graph["edges"]) == 0


# -----------------------------------------------------------------------
# Search
# -----------------------------------------------------------------------


class TestSearch:
    def test_search_basic(self, client: TestClient):
        client.post("/add", json={"text": "Python programming language"})
        client.post("/add", json={"text": "JavaScript framework React"})
        client.post("/add", json={"text": "Python data science with pandas"})

        resp = client.post(
            "/search", json={"query": "Python programming", "limit": 10}
        )
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) > 0
        # Python programming should be top result
        assert "Python" in results[0]["text"]

    def test_search_respects_user_id(self, client: TestClient):
        client.post(
            "/add", json={"text": "Alice knowledge", "user_id": "alice"}
        )
        client.post(
            "/add", json={"text": "Bob knowledge", "user_id": "bob"}
        )

        results = client.post(
            "/search",
            json={"query": "knowledge", "user_id": "alice"},
        ).json()
        assert len(results) == 1
        assert results[0]["user_id"] == "alice"

    def test_search_limit(self, client: TestClient):
        for i in range(10):
            client.post("/add", json={"text": f"Memory about topic {i}"})

        results = client.post(
            "/search", json={"query": "Memory topic", "limit": 3}
        ).json()
        assert len(results) <= 3

    def test_search_empty_results(self, client: TestClient):
        client.post("/add", json={"text": "Unrelated content"})
        results = client.post(
            "/search", json={"query": "xyznonexistent", "limit": 5}
        ).json()
        # May return low-scoring results or empty
        if len(results) > 0:
            assert results[0]["score"] < 0.5

    def test_search_returns_scores(self, client: TestClient):
        client.post("/add", json={"text": "Machine learning algorithms"})
        results = client.post(
            "/search", json={"query": "machine learning"}
        ).json()
        assert len(results) > 0
        assert "score" in results[0]
        assert isinstance(results[0]["score"], float)

    def test_search_score_ordering(self, client: TestClient):
        client.post("/add", json={"text": "The weather is nice today"})
        client.post("/add", json={"text": "Machine learning with Python"})
        client.post(
            "/add",
            json={"text": "Deep machine learning neural networks in Python"},
        )

        results = client.post(
            "/search", json={"query": "machine learning Python"}
        ).json()
        if len(results) >= 2:
            assert results[0]["score"] >= results[1]["score"]


# -----------------------------------------------------------------------
# Search helper unit tests
# -----------------------------------------------------------------------


class TestSearchHelpers:
    def test_search_memories_empty_query(self):
        memories = [{"text": "hello"}]
        assert search_memories("", memories) == []

    def test_search_memories_empty_list(self):
        assert search_memories("hello", []) == []

    def test_search_memories_exact_match_scores_high(self):
        memories = [
            {"text": "exact match query"},
            {"text": "completely different content"},
        ]
        results = search_memories("exact match query", memories)
        assert len(results) > 0
        assert results[0]["text"] == "exact match query"
        assert results[0]["score"] > 0.5

    def test_search_memories_partial_match(self):
        memories = [
            {"text": "Python is a great programming language"},
            {"text": "JavaScript is popular for web development"},
        ]
        results = search_memories("Python programming", memories)
        assert len(results) > 0
        assert "Python" in results[0]["text"]


# -----------------------------------------------------------------------
# Graph endpoints
# -----------------------------------------------------------------------


class TestGraph:
    def test_graph_empty(self, client: TestClient):
        resp = client.get("/graph")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nodes"] == []
        assert data["edges"] == []

    def test_graph_with_nodes_only(self, client: TestClient):
        client.post("/add", json={"text": "Node A"})
        client.post("/add", json={"text": "Node B"})
        graph = client.get("/graph").json()
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) == 0

    def test_add_edge(self, client: TestClient):
        m1 = client.post("/add", json={"text": "Node A"}).json()
        m2 = client.post("/add", json={"text": "Node B"}).json()
        resp = client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": m2["id"],
                "relation": "related_to",
            },
        )
        assert resp.status_code == 201
        edge = resp.json()
        assert edge["source_id"] == m1["id"]
        assert edge["target_id"] == m2["id"]
        assert edge["relation"] == "related_to"

    def test_graph_with_edges(self, client: TestClient):
        m1 = client.post("/add", json={"text": "Source"}).json()
        m2 = client.post("/add", json={"text": "Target"}).json()
        client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": m2["id"],
                "relation": "depends_on",
            },
        )
        graph = client.get("/graph").json()
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) == 1
        assert graph["edges"][0]["source"] == m1["id"]
        assert graph["edges"][0]["target"] == m2["id"]
        assert graph["edges"][0]["relation"] == "depends_on"

    def test_add_edge_missing_source(self, client: TestClient):
        m2 = client.post("/add", json={"text": "Target"}).json()
        resp = client.post(
            "/graph/edge",
            json={
                "source_id": "nonexistent",
                "target_id": m2["id"],
                "relation": "test",
            },
        )
        assert resp.status_code == 404

    def test_add_edge_missing_target(self, client: TestClient):
        m1 = client.post("/add", json={"text": "Source"}).json()
        resp = client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": "nonexistent",
                "relation": "test",
            },
        )
        assert resp.status_code == 404

    def test_delete_edge(self, client: TestClient):
        m1 = client.post("/add", json={"text": "A"}).json()
        m2 = client.post("/add", json={"text": "B"}).json()
        edge = client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": m2["id"],
                "relation": "link",
            },
        ).json()

        resp = client.delete(f"/graph/edge/{edge['id']}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

        graph = client.get("/graph").json()
        assert len(graph["edges"]) == 0

    def test_delete_nonexistent_edge(self, client: TestClient):
        resp = client.delete("/graph/edge/nonexistent")
        assert resp.status_code == 404

    def test_graph_respects_user_id(self, client: TestClient):
        client.post("/add", json={"text": "Global node"})
        client.post(
            "/add", json={"text": "Alice node", "user_id": "alice"}
        )

        global_graph = client.get("/graph?user_id=global").json()
        alice_graph = client.get("/graph?user_id=alice").json()
        assert len(global_graph["nodes"]) == 1
        assert len(alice_graph["nodes"]) == 1

    def test_multiple_edges_between_nodes(self, client: TestClient):
        m1 = client.post("/add", json={"text": "A"}).json()
        m2 = client.post("/add", json={"text": "B"}).json()
        client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": m2["id"],
                "relation": "related",
            },
        )
        client.post(
            "/graph/edge",
            json={
                "source_id": m1["id"],
                "target_id": m2["id"],
                "relation": "derived_from",
            },
        )
        graph = client.get("/graph").json()
        assert len(graph["edges"]) == 2


# -----------------------------------------------------------------------
# Integration / edge cases
# -----------------------------------------------------------------------


class TestEdgeCases:
    def test_unicode_text(self, client: TestClient):
        resp = client.post(
            "/add", json={"text": "Memories in Japanese: \u8a18\u61b6\u30e2\u30b8\u30e5\u30fc\u30eb"}
        )
        assert resp.status_code == 201
        mem = resp.json()
        fetched = client.get(f"/get/{mem['id']}").json()
        assert "\u8a18\u61b6" in fetched["text"]

    def test_long_text(self, client: TestClient):
        long_text = "x" * 10000
        resp = client.post("/add", json={"text": long_text})
        assert resp.status_code == 201

    def test_special_chars_in_metadata(self, client: TestClient):
        metadata = {"path": "/some/path/with spaces", "query": 'SELECT * FROM "table"'}
        resp = client.post(
            "/add", json={"text": "Special", "metadata": metadata}
        )
        assert resp.status_code == 201
        fetched = client.get(f"/get/{resp.json()['id']}").json()
        assert fetched["metadata"]["path"] == "/some/path/with spaces"

    def test_concurrent_adds(self, client: TestClient):
        """Add many memories rapidly to test thread safety."""
        import concurrent.futures

        def add_mem(i: int):
            return client.post("/add", json={"text": f"Concurrent {i}"})

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            futures = [pool.submit(add_mem, i) for i in range(20)]
            results = [f.result() for f in futures]

        assert all(r.status_code == 201 for r in results)
        health = client.get("/health").json()
        assert health["count"] == 20

    def test_search_with_metadata_preserved(self, client: TestClient):
        client.post(
            "/add",
            json={
                "text": "Important meeting notes",
                "metadata": {"source": "calendar", "priority": "high"},
            },
        )
        results = client.post(
            "/search", json={"query": "meeting notes"}
        ).json()
        assert len(results) > 0
        assert results[0]["metadata"]["source"] == "calendar"
        assert results[0]["metadata"]["priority"] == "high"

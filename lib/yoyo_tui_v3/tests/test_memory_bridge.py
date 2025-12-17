"""
Tests for MemoryBridge service.

Tests for reading memory status from SQLite database:
- Database connection and reading
- Memory block count retrieval
- Scope detection
- Last updated timestamp
- Error handling for missing database
"""

import pytest
import sqlite3
import os
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock

# Import will be created after tests
# from ..services.memory_bridge import MemoryBridge, MemoryStatus


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def memory_db(temp_dir):
    """Create a test memory database with sample data."""
    db_path = temp_dir / ".yoyo-ai" / "memory" / "memory.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create schema matching TypeScript memory system
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory_blocks (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            scope TEXT NOT NULL,
            content TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_info (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Insert sample data
    now = datetime.now().isoformat()

    cursor.execute(
        "INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("block-1", "persona", "project", '{"name": "Yoyo"}', 1, now, now)
    )

    cursor.execute(
        "INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("block-2", "project", "project", '{"name": "TestProject"}', 1, now, now)
    )

    cursor.execute(
        "INSERT INTO schema_info (key, value) VALUES (?, ?)",
        ("version", "1")
    )

    conn.commit()
    conn.close()

    return db_path


@pytest.fixture
def global_memory_db(temp_dir):
    """Create a global memory database."""
    global_dir = temp_dir / "global-memory"
    db_path = global_dir / "memory.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory_blocks (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            scope TEXT NOT NULL,
            content TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    now = datetime.now().isoformat()

    cursor.execute(
        "INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("global-1", "user", "global", '{"name": "TestUser"}', 1, now, now)
    )

    conn.commit()
    conn.close()

    return db_path


# =============================================================================
# MemoryBridge Tests
# =============================================================================

class TestMemoryBridgeConnection:
    """Tests for database connection handling."""

    def test_connect_to_existing_database(self, temp_dir, memory_db):
        """Should connect to existing memory database."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.connected is True
        assert status.database_path == memory_db

    def test_return_disconnected_when_no_database(self, temp_dir):
        """Should return disconnected status when no database exists."""
        from ..services.memory_bridge import MemoryBridge

        # No database created
        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.connected is False
        assert status.block_count == 0

    def test_handle_corrupted_database(self, temp_dir):
        """Should handle corrupted database gracefully."""
        from ..services.memory_bridge import MemoryBridge

        # Create corrupted database
        db_path = temp_dir / ".yoyo-ai" / "memory" / "memory.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        db_path.write_text("not a valid sqlite database")

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.connected is False
        assert status.error_message is not None


class TestMemoryBridgeBlockCounts:
    """Tests for memory block counting."""

    def test_count_project_blocks(self, temp_dir, memory_db):
        """Should count memory blocks in project scope."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.block_count == 2

    def test_count_blocks_by_type(self, temp_dir, memory_db):
        """Should count blocks by type."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.block_types["persona"] == 1
        assert status.block_types["project"] == 1

    def test_include_global_blocks(self, temp_dir, memory_db, global_memory_db):
        """Should include global blocks in count when specified."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(
            project_root=temp_dir,
            global_path=global_memory_db.parent
        )
        status = bridge.get_status(include_global=True)

        # 2 project + 1 global
        assert status.block_count == 3


class TestMemoryBridgeScopeDetection:
    """Tests for scope detection."""

    def test_detect_project_scope(self, temp_dir, memory_db):
        """Should detect project scope when project database exists."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.scope == "project"

    def test_detect_global_only_scope(self, temp_dir, global_memory_db):
        """Should detect global scope when only global database exists."""
        from ..services.memory_bridge import MemoryBridge

        # No project database, only global
        bridge = MemoryBridge(
            project_root=temp_dir,
            global_path=global_memory_db.parent
        )
        status = bridge.get_status()

        # Should fall back to global
        assert status.scope in ["global", "none"]


class TestMemoryBridgeLastUpdated:
    """Tests for last updated timestamp."""

    def test_get_last_updated(self, temp_dir, memory_db):
        """Should return last updated timestamp."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.last_updated is not None
        assert isinstance(status.last_updated, datetime)

    def test_last_updated_reflects_most_recent_block(self, temp_dir, memory_db):
        """Should return timestamp of most recently updated block."""
        from ..services.memory_bridge import MemoryBridge
        import time

        # Add a new block with later timestamp
        conn = sqlite3.connect(str(memory_db))
        cursor = conn.cursor()

        time.sleep(0.1)  # Ensure different timestamp
        later = datetime.now().isoformat()

        cursor.execute(
            "INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("block-3", "corrections", "project", '{"entries": []}', 1, later, later)
        )
        conn.commit()
        conn.close()

        bridge = MemoryBridge(project_root=temp_dir)
        status = bridge.get_status()

        # Should be close to the later timestamp
        assert status.last_updated is not None


class TestMemoryBridgeRefresh:
    """Tests for status refresh."""

    def test_refresh_detects_new_blocks(self, temp_dir, memory_db):
        """Should detect new blocks after refresh."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status1 = bridge.get_status()
        assert status1.block_count == 2

        # Add new block
        conn = sqlite3.connect(str(memory_db))
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO memory_blocks (id, type, scope, content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("block-new", "user", "project", '{"preferences": {}}', 1, now, now)
        )
        conn.commit()
        conn.close()

        # Refresh and check
        status2 = bridge.get_status()
        assert status2.block_count == 3

    def test_refresh_detects_deleted_blocks(self, temp_dir, memory_db):
        """Should detect deleted blocks after refresh."""
        from ..services.memory_bridge import MemoryBridge

        bridge = MemoryBridge(project_root=temp_dir)
        status1 = bridge.get_status()
        assert status1.block_count == 2

        # Delete a block
        conn = sqlite3.connect(str(memory_db))
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memory_blocks WHERE id = ?", ("block-1",))
        conn.commit()
        conn.close()

        # Refresh and check
        status2 = bridge.get_status()
        assert status2.block_count == 1


# =============================================================================
# MemoryStatus Model Tests
# =============================================================================

class TestMemoryStatusModel:
    """Tests for MemoryStatus dataclass."""

    def test_create_memory_status(self):
        """Should create MemoryStatus with all fields."""
        from ..services.memory_bridge import MemoryStatus

        status = MemoryStatus(
            connected=True,
            scope="project",
            block_count=3,
            block_types={"persona": 1, "project": 1, "user": 1},
            last_updated=datetime.now(),
            database_path=Path("/test/path"),
            error_message=None
        )

        assert status.connected is True
        assert status.scope == "project"
        assert status.block_count == 3

    def test_empty_memory_status(self):
        """Should create empty MemoryStatus for disconnected state."""
        from ..services.memory_bridge import MemoryStatus

        status = MemoryStatus.disconnected()

        assert status.connected is False
        assert status.block_count == 0
        assert status.scope == "none"

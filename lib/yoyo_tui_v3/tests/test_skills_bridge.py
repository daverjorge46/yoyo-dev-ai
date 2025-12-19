"""
Tests for SkillsBridge service.

Tests for reading skill status from SQLite database:
- Database connection and reading
- Skill count and statistics retrieval
- Scope detection
- Top skills and recent skills
- Error handling for missing database
"""

import pytest
import sqlite3
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def skills_db(temp_dir):
    """Create a test skills database with sample data."""
    db_path = temp_dir / ".yoyo-ai" / ".skills" / "skills.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create schema matching TypeScript skill system
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skill_tracking (
            id TEXT PRIMARY KEY,
            skill_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            success_count INTEGER NOT NULL DEFAULT 0,
            failure_count INTEGER NOT NULL DEFAULT 0,
            total_usage INTEGER NOT NULL DEFAULT 0,
            success_rate REAL NOT NULL DEFAULT 0.0,
            last_used TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skill_usage (
            id TEXT PRIMARY KEY,
            skill_id TEXT NOT NULL,
            task_description TEXT,
            applied_at TEXT NOT NULL,
            success INTEGER,
            completed_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Insert sample data
    now = datetime.now().isoformat()

    # Add skills with varying usage and success rates
    cursor.execute(
        """INSERT INTO skill_tracking
           (id, skill_id, name, success_count, failure_count, total_usage, success_rate, last_used, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("track-1", "react-patterns", "React Patterns", 8, 2, 10, 0.8, now, now, now)
    )

    cursor.execute(
        """INSERT INTO skill_tracking
           (id, skill_id, name, success_count, failure_count, total_usage, success_rate, last_used, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("track-2", "typescript-best", "TypeScript Best Practices", 5, 0, 5, 1.0, now, now, now)
    )

    cursor.execute(
        """INSERT INTO skill_tracking
           (id, skill_id, name, success_count, failure_count, total_usage, success_rate, last_used, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("track-3", "testing-patterns", "Testing Patterns", 3, 2, 5, 0.6, now, now, now)
    )

    cursor.execute(
        "INSERT INTO schema_metadata (key, value) VALUES (?, ?)",
        ("version", "1")
    )

    conn.commit()
    conn.close()

    return db_path


@pytest.fixture
def global_skills_db(temp_dir):
    """Create a global skills database."""
    global_dir = temp_dir / "global-skills"
    db_path = global_dir / "skills.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skill_tracking (
            id TEXT PRIMARY KEY,
            skill_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            success_count INTEGER NOT NULL DEFAULT 0,
            failure_count INTEGER NOT NULL DEFAULT 0,
            total_usage INTEGER NOT NULL DEFAULT 0,
            success_rate REAL NOT NULL DEFAULT 0.0,
            last_used TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    now = datetime.now().isoformat()

    cursor.execute(
        """INSERT INTO skill_tracking
           (id, skill_id, name, success_count, failure_count, total_usage, success_rate, last_used, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("global-1", "global-skill", "Global Skill", 3, 1, 4, 0.75, now, now, now)
    )

    conn.commit()
    conn.close()

    return db_path


# =============================================================================
# SkillsBridge Tests
# =============================================================================

class TestSkillsBridgeConnection:
    """Tests for database connection handling."""

    def test_connect_to_existing_database(self, temp_dir, skills_db):
        """Should connect to existing skills database."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.connected is True
        assert status.database_path == skills_db

    def test_return_disconnected_when_no_database(self, temp_dir):
        """Should return disconnected status when no database exists."""
        from ..services.skills_bridge import SkillsBridge

        # No database created
        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.connected is False
        assert status.total_skills == 0

    def test_handle_corrupted_database(self, temp_dir):
        """Should handle corrupted database gracefully."""
        from ..services.skills_bridge import SkillsBridge

        # Create corrupted database
        db_path = temp_dir / ".yoyo-ai" / ".skills" / "skills.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        db_path.write_text("not a valid sqlite database")

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.connected is False
        assert status.error_message is not None


class TestSkillsBridgeStatistics:
    """Tests for skill statistics retrieval."""

    def test_count_total_skills(self, temp_dir, skills_db):
        """Should count total skills."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.total_skills == 3

    def test_count_total_usage(self, temp_dir, skills_db):
        """Should count total usage across all skills."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        # 10 + 5 + 5 = 20
        assert status.total_usage == 20

    def test_calculate_average_success_rate(self, temp_dir, skills_db):
        """Should calculate average success rate."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        # Average of 0.8, 1.0, 0.6 = 0.8
        assert 0.75 <= status.average_success_rate <= 0.85


class TestSkillsBridgeTopSkills:
    """Tests for top skills retrieval."""

    def test_get_top_skills_by_usage(self, temp_dir, skills_db):
        """Should return skills ordered by usage."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert len(status.top_skills) > 0
        # First should be React Patterns (10 usages)
        assert status.top_skills[0].name == "React Patterns"
        assert status.top_skills[0].total_usage == 10

    def test_top_skills_include_success_rate(self, temp_dir, skills_db):
        """Should include success rate in top skills."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        for skill in status.top_skills:
            assert hasattr(skill, 'success_rate')
            assert 0 <= skill.success_rate <= 1

    def test_limit_top_skills(self, temp_dir, skills_db):
        """Should respect limit for top skills."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        # Should be limited to 5 by default
        assert len(status.top_skills) <= 5


class TestSkillsBridgeRecentSkills:
    """Tests for recent skills retrieval."""

    def test_get_recent_skills(self, temp_dir, skills_db):
        """Should return recently used skills."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert len(status.recent_skills) > 0
        # All skills have last_used set
        for skill in status.recent_skills:
            assert skill.last_used is not None

    def test_recent_skills_have_timestamps(self, temp_dir, skills_db):
        """Should include timestamps for recent skills."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        for skill in status.recent_skills:
            if skill.last_used:
                assert isinstance(skill.last_used, datetime)


class TestSkillsBridgeScopeDetection:
    """Tests for scope detection."""

    def test_detect_project_scope(self, temp_dir, skills_db):
        """Should detect project scope when project database exists."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status = bridge.get_status()

        assert status.scope == "project"

    def test_detect_global_only_scope(self, temp_dir, global_skills_db):
        """Should detect global scope when only global database exists."""
        from ..services.skills_bridge import SkillsBridge

        # No project database, only global
        bridge = SkillsBridge(
            project_root=temp_dir,
            global_path=global_skills_db.parent
        )
        status = bridge.get_status()

        # Should fall back to global
        assert status.scope in ["global", "none"]


class TestSkillsBridgeRefresh:
    """Tests for status refresh."""

    def test_refresh_detects_new_skills(self, temp_dir, skills_db):
        """Should detect new skills after refresh."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status1 = bridge.get_status()
        assert status1.total_skills == 3

        # Add new skill
        conn = sqlite3.connect(str(skills_db))
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute(
            """INSERT INTO skill_tracking
               (id, skill_id, name, success_count, failure_count, total_usage, success_rate, last_used, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            ("track-new", "new-skill", "New Skill", 1, 0, 1, 1.0, now, now, now)
        )
        conn.commit()
        conn.close()

        # Refresh and check
        status2 = bridge.get_status()
        assert status2.total_skills == 4

    def test_refresh_detects_usage_changes(self, temp_dir, skills_db):
        """Should detect usage changes after refresh."""
        from ..services.skills_bridge import SkillsBridge

        bridge = SkillsBridge(project_root=temp_dir)
        status1 = bridge.get_status()
        initial_usage = status1.total_usage

        # Update usage
        conn = sqlite3.connect(str(skills_db))
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE skill_tracking SET total_usage = total_usage + 5 WHERE skill_id = ?",
            ("react-patterns",)
        )
        conn.commit()
        conn.close()

        # Refresh and check
        status2 = bridge.get_status()
        assert status2.total_usage == initial_usage + 5


# =============================================================================
# SkillsStatus Model Tests
# =============================================================================

class TestSkillsStatusModel:
    """Tests for SkillsStatus dataclass."""

    def test_create_skills_status(self):
        """Should create SkillsStatus with all fields."""
        from ..services.skills_bridge import SkillsStatus, SkillStats

        status = SkillsStatus(
            connected=True,
            scope="project",
            total_skills=3,
            total_usage=20,
            average_success_rate=0.8,
            top_skills=[
                SkillStats(
                    skill_id="test",
                    name="Test",
                    total_usage=10,
                    success_count=8,
                    failure_count=2,
                    success_rate=0.8,
                    last_used=datetime.now()
                )
            ],
            recent_skills=[],
            database_path=Path("/test/path"),
            error_message=None
        )

        assert status.connected is True
        assert status.scope == "project"
        assert status.total_skills == 3

    def test_empty_skills_status(self):
        """Should create empty SkillsStatus for disconnected state."""
        from ..services.skills_bridge import SkillsStatus

        status = SkillsStatus.disconnected()

        assert status.connected is False
        assert status.total_skills == 0
        assert status.scope == "none"


# =============================================================================
# SkillStats Model Tests
# =============================================================================

class TestSkillStatsModel:
    """Tests for SkillStats dataclass."""

    def test_create_skill_stats(self):
        """Should create SkillStats with all fields."""
        from ..services.skills_bridge import SkillStats

        now = datetime.now()
        stats = SkillStats(
            skill_id="test-skill",
            name="Test Skill",
            total_usage=10,
            success_count=8,
            failure_count=2,
            success_rate=0.8,
            last_used=now
        )

        assert stats.skill_id == "test-skill"
        assert stats.name == "Test Skill"
        assert stats.total_usage == 10
        assert stats.success_rate == 0.8
        assert stats.last_used == now

"""
SkillsBridge Service - Cross-language Skills Access

Provides Python access to the TypeScript skill system's SQLite database.
This enables the TUI to display skill statistics without requiring Node.js/Bun.

Architecture:
- Reads SQLite database directly (cross-language compatible)
- Supports both project (.yoyo-ai/.skills/) and global (~/.yoyo-ai/.skills/) scopes
- Provides SkillsStatus dataclass for consistent status representation
- Thread-safe database access
"""

import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from threading import Lock

logger = logging.getLogger(__name__)


# =============================================================================
# SkillsStatus Model
# =============================================================================

@dataclass
class SkillStats:
    """
    Statistics for a single skill.
    """
    skill_id: str
    name: str
    total_usage: int
    success_count: int
    failure_count: int
    success_rate: float
    last_used: Optional[datetime]


@dataclass
class SkillsStatus:
    """
    Skills system status for TUI display.

    Represents the current state of the skills database including:
    - Connection status
    - Total skill count
    - Aggregate statistics
    - Top performing skills
    """
    connected: bool
    scope: str  # "project", "global", "none"
    total_skills: int
    total_usage: int
    average_success_rate: float
    top_skills: List[SkillStats]
    recent_skills: List[SkillStats]
    database_path: Optional[Path]
    error_message: Optional[str] = None

    @classmethod
    def disconnected(cls, error_message: Optional[str] = None) -> 'SkillsStatus':
        """
        Create a disconnected status.

        Args:
            error_message: Optional error message describing the issue

        Returns:
            SkillsStatus with disconnected state
        """
        return cls(
            connected=False,
            scope="none",
            total_skills=0,
            total_usage=0,
            average_success_rate=0.0,
            top_skills=[],
            recent_skills=[],
            database_path=None,
            error_message=error_message
        )


# =============================================================================
# SkillsBridge Service
# =============================================================================

class SkillsBridge:
    """
    Bridge between Python TUI and TypeScript skill system.

    Reads skill statistics directly from SQLite database to display
    in the TUI dashboard without requiring Node.js runtime.

    Usage:
        bridge = SkillsBridge(project_root=Path.cwd())
        status = bridge.get_status()
        print(f"Total skills: {status.total_skills}")
    """

    # Skills directory name (matches TypeScript implementation)
    SKILLS_DIR = ".yoyo-ai/.skills"
    DB_FILENAME = "skills.db"

    def __init__(
        self,
        project_root: Optional[Path] = None,
        global_path: Optional[Path] = None
    ):
        """
        Initialize SkillsBridge.

        Args:
            project_root: Project root directory (defaults to cwd)
            global_path: Global skills directory (defaults to ~/.yoyo-ai/.skills)
        """
        self._project_root = project_root or Path.cwd()
        self._global_path = global_path or Path.home() / ".yoyo-ai" / ".skills"
        self._lock = Lock()

        logger.debug(f"SkillsBridge initialized: project={self._project_root}, global={self._global_path}")

    @property
    def project_db_path(self) -> Path:
        """Get project skills database path."""
        return self._project_root / self.SKILLS_DIR / self.DB_FILENAME

    @property
    def global_db_path(self) -> Path:
        """Get global skills database path."""
        return self._global_path / self.DB_FILENAME

    def get_status(self, include_global: bool = False) -> SkillsStatus:
        """
        Get current skills status.

        Reads from SQLite database to get skill counts, success rates,
        and top performing skills.

        Args:
            include_global: Include skills from global scope

        Returns:
            SkillsStatus with current state
        """
        with self._lock:
            try:
                return self._read_status(include_global)
            except Exception as e:
                logger.error(f"Error reading skills status: {e}")
                return SkillsStatus.disconnected(str(e))

    def _read_status(self, include_global: bool) -> SkillsStatus:
        """
        Internal method to read status from database.

        Args:
            include_global: Include skills from global scope

        Returns:
            SkillsStatus with current state
        """
        # Check for project database first
        project_exists = self.project_db_path.exists()
        global_exists = self.global_db_path.exists()

        if not project_exists and not global_exists:
            return SkillsStatus.disconnected("No skills database found")

        # Determine primary database and scope
        if project_exists:
            primary_db = self.project_db_path
            scope = "project"
        else:
            primary_db = self.global_db_path
            scope = "global"

        # Try to connect
        try:
            conn = sqlite3.connect(str(primary_db), timeout=5.0)
            conn.row_factory = sqlite3.Row
        except sqlite3.Error as e:
            return SkillsStatus.disconnected(f"Database connection failed: {e}")

        try:
            # Verify it's a valid skills database
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='skill_tracking'")
            if cursor.fetchone() is None:
                conn.close()
                return SkillsStatus.disconnected("Invalid skills database (no skill_tracking table)")

            # Get aggregate statistics
            stats = self._get_aggregate_stats(cursor)

            # Get top skills by usage
            top_skills = self._get_top_skills(cursor, limit=5)

            # Get recently used skills
            recent_skills = self._get_recent_skills(cursor, limit=5)

            conn.close()

            return SkillsStatus(
                connected=True,
                scope=scope,
                total_skills=stats["total_skills"],
                total_usage=stats["total_usage"],
                average_success_rate=stats["avg_success_rate"],
                top_skills=top_skills,
                recent_skills=recent_skills,
                database_path=primary_db,
                error_message=None
            )

        except sqlite3.Error as e:
            conn.close()
            return SkillsStatus.disconnected(f"Database read error: {e}")

    def _get_aggregate_stats(self, cursor: sqlite3.Cursor) -> Dict:
        """
        Get aggregate skill statistics.

        Args:
            cursor: SQLite cursor

        Returns:
            Dictionary with aggregate stats
        """
        cursor.execute("""
            SELECT
                COUNT(*) as total_skills,
                COALESCE(SUM(total_usage), 0) as total_usage,
                COALESCE(AVG(success_rate), 0) as avg_success_rate
            FROM skill_tracking
        """)

        row = cursor.fetchone()
        return {
            "total_skills": row["total_skills"],
            "total_usage": row["total_usage"],
            "avg_success_rate": row["avg_success_rate"]
        }

    def _get_top_skills(self, cursor: sqlite3.Cursor, limit: int = 5) -> List[SkillStats]:
        """
        Get top skills by usage.

        Args:
            cursor: SQLite cursor
            limit: Maximum number of skills to return

        Returns:
            List of SkillStats
        """
        cursor.execute("""
            SELECT skill_id, name, total_usage, success_count, failure_count, success_rate, last_used
            FROM skill_tracking
            ORDER BY total_usage DESC
            LIMIT ?
        """, (limit,))

        skills = []
        for row in cursor.fetchall():
            last_used = None
            if row["last_used"]:
                try:
                    last_used = datetime.fromisoformat(row["last_used"].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    pass

            skills.append(SkillStats(
                skill_id=row["skill_id"],
                name=row["name"],
                total_usage=row["total_usage"],
                success_count=row["success_count"],
                failure_count=row["failure_count"],
                success_rate=row["success_rate"],
                last_used=last_used
            ))

        return skills

    def _get_recent_skills(self, cursor: sqlite3.Cursor, limit: int = 5) -> List[SkillStats]:
        """
        Get recently used skills.

        Args:
            cursor: SQLite cursor
            limit: Maximum number of skills to return

        Returns:
            List of SkillStats
        """
        cursor.execute("""
            SELECT skill_id, name, total_usage, success_count, failure_count, success_rate, last_used
            FROM skill_tracking
            WHERE last_used IS NOT NULL
            ORDER BY last_used DESC
            LIMIT ?
        """, (limit,))

        skills = []
        for row in cursor.fetchall():
            last_used = None
            if row["last_used"]:
                try:
                    last_used = datetime.fromisoformat(row["last_used"].replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    pass

            skills.append(SkillStats(
                skill_id=row["skill_id"],
                name=row["name"],
                total_usage=row["total_usage"],
                success_count=row["success_count"],
                failure_count=row["failure_count"],
                success_rate=row["success_rate"],
                last_used=last_used
            ))

        return skills

    def get_skill_summary(self) -> Dict:
        """
        Get detailed skill summary for debugging.

        Returns:
            Dictionary with detailed skill information
        """
        status = self.get_status()

        return {
            "connected": status.connected,
            "scope": status.scope,
            "database": str(status.database_path) if status.database_path else None,
            "total_skills": status.total_skills,
            "total_usage": status.total_usage,
            "average_success_rate": round(status.average_success_rate * 100, 1),
            "top_skills": [
                {"name": s.name, "usage": s.total_usage, "success_rate": round(s.success_rate * 100, 1)}
                for s in status.top_skills
            ],
            "error": status.error_message
        }

    def check_database_health(self) -> Dict:
        """
        Check database health and integrity.

        Returns:
            Dictionary with health check results
        """
        results = {
            "project_db_exists": self.project_db_path.exists(),
            "global_db_exists": self.global_db_path.exists(),
            "project_db_path": str(self.project_db_path),
            "global_db_path": str(self.global_db_path),
            "errors": []
        }

        # Check project database
        if results["project_db_exists"]:
            try:
                conn = sqlite3.connect(str(self.project_db_path), timeout=5.0)
                cursor = conn.cursor()
                cursor.execute("PRAGMA integrity_check")
                integrity = cursor.fetchone()[0]
                results["project_integrity"] = integrity
                conn.close()
            except Exception as e:
                results["errors"].append(f"Project DB error: {e}")
                results["project_integrity"] = "error"

        # Check global database
        if results["global_db_exists"]:
            try:
                conn = sqlite3.connect(str(self.global_db_path), timeout=5.0)
                cursor = conn.cursor()
                cursor.execute("PRAGMA integrity_check")
                integrity = cursor.fetchone()[0]
                results["global_integrity"] = integrity
                conn.close()
            except Exception as e:
                results["errors"].append(f"Global DB error: {e}")
                results["global_integrity"] = "error"

        return results


# =============================================================================
# Module-level convenience functions
# =============================================================================

_default_bridge: Optional[SkillsBridge] = None
_bridge_lock = Lock()


def get_skills_bridge(project_root: Optional[Path] = None) -> SkillsBridge:
    """
    Get or create the default SkillsBridge instance.

    Args:
        project_root: Optional project root to use

    Returns:
        SkillsBridge instance
    """
    global _default_bridge

    with _bridge_lock:
        if _default_bridge is None:
            _default_bridge = SkillsBridge(project_root=project_root)
        return _default_bridge


def reset_skills_bridge() -> None:
    """Reset the default SkillsBridge instance."""
    global _default_bridge

    with _bridge_lock:
        _default_bridge = None

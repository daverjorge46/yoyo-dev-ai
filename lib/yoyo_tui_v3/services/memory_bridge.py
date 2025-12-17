"""
MemoryBridge Service - Cross-language Memory Access

Provides Python access to the TypeScript memory system's SQLite database.
This enables the TUI to display memory status without requiring Node.js/Bun.

Architecture:
- Reads SQLite database directly (cross-language compatible)
- Supports both project (.yoyo-ai/memory/) and global (~/.yoyo-ai/memory/) scopes
- Provides MemoryStatus dataclass for consistent status representation
- Thread-safe database access with connection pooling
"""

import logging
import sqlite3
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from threading import Lock

logger = logging.getLogger(__name__)


# =============================================================================
# MemoryStatus Model
# =============================================================================

@dataclass
class MemoryStatus:
    """
    Memory system status for TUI display.

    Represents the current state of the memory database including:
    - Connection status
    - Block counts by type
    - Active scope
    - Last updated timestamp
    """
    connected: bool
    scope: str  # "project", "global", "none"
    block_count: int
    block_types: Dict[str, int]  # {"persona": 1, "project": 1, ...}
    last_updated: Optional[datetime]
    database_path: Optional[Path]
    error_message: Optional[str] = None

    @classmethod
    def disconnected(cls, error_message: Optional[str] = None) -> 'MemoryStatus':
        """
        Create a disconnected status.

        Args:
            error_message: Optional error message describing the issue

        Returns:
            MemoryStatus with disconnected state
        """
        return cls(
            connected=False,
            scope="none",
            block_count=0,
            block_types={},
            last_updated=None,
            database_path=None,
            error_message=error_message
        )


# =============================================================================
# MemoryBridge Service
# =============================================================================

class MemoryBridge:
    """
    Bridge between Python TUI and TypeScript memory system.

    Reads memory status directly from SQLite database to display
    in the TUI dashboard without requiring Node.js runtime.

    Usage:
        bridge = MemoryBridge(project_root=Path.cwd())
        status = bridge.get_status()
        print(f"Memory blocks: {status.block_count}")
    """

    # Memory directory name (matches TypeScript implementation)
    MEMORY_DIR = ".yoyo-ai/memory"
    DB_FILENAME = "memory.db"

    def __init__(
        self,
        project_root: Optional[Path] = None,
        global_path: Optional[Path] = None
    ):
        """
        Initialize MemoryBridge.

        Args:
            project_root: Project root directory (defaults to cwd)
            global_path: Global memory directory (defaults to ~/.yoyo-ai/memory)
        """
        self._project_root = project_root or Path.cwd()
        self._global_path = global_path or Path.home() / ".yoyo-ai" / "memory"
        self._lock = Lock()

        logger.debug(f"MemoryBridge initialized: project={self._project_root}, global={self._global_path}")

    @property
    def project_db_path(self) -> Path:
        """Get project memory database path."""
        return self._project_root / self.MEMORY_DIR / self.DB_FILENAME

    @property
    def global_db_path(self) -> Path:
        """Get global memory database path."""
        return self._global_path / self.DB_FILENAME

    def get_status(self, include_global: bool = False) -> MemoryStatus:
        """
        Get current memory status.

        Reads from SQLite database to get block counts, scope, and
        last updated timestamp.

        Args:
            include_global: Include blocks from global scope

        Returns:
            MemoryStatus with current state
        """
        with self._lock:
            try:
                return self._read_status(include_global)
            except Exception as e:
                logger.error(f"Error reading memory status: {e}")
                return MemoryStatus.disconnected(str(e))

    def _read_status(self, include_global: bool) -> MemoryStatus:
        """
        Internal method to read status from database.

        Args:
            include_global: Include blocks from global scope

        Returns:
            MemoryStatus with current state
        """
        # Check for project database first
        project_exists = self.project_db_path.exists()
        global_exists = self.global_db_path.exists()

        if not project_exists and not global_exists:
            return MemoryStatus.disconnected("No memory database found")

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
            return MemoryStatus.disconnected(f"Database connection failed: {e}")

        try:
            # Verify it's a valid memory database
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_blocks'")
            if cursor.fetchone() is None:
                conn.close()
                return MemoryStatus.disconnected("Invalid memory database (no memory_blocks table)")

            # Get block counts
            block_types = self._get_block_counts(cursor)
            total_count = sum(block_types.values())

            # Include global blocks if requested
            if include_global and project_exists and global_exists:
                global_types = self._get_global_block_counts()
                for block_type, count in global_types.items():
                    block_types[block_type] = block_types.get(block_type, 0) + count
                total_count = sum(block_types.values())

            # Get last updated timestamp
            last_updated = self._get_last_updated(cursor)

            conn.close()

            return MemoryStatus(
                connected=True,
                scope=scope,
                block_count=total_count,
                block_types=block_types,
                last_updated=last_updated,
                database_path=primary_db,
                error_message=None
            )

        except sqlite3.Error as e:
            conn.close()
            return MemoryStatus.disconnected(f"Database read error: {e}")

    def _get_block_counts(self, cursor: sqlite3.Cursor) -> Dict[str, int]:
        """
        Get block counts by type from database.

        Args:
            cursor: SQLite cursor

        Returns:
            Dictionary mapping block type to count
        """
        cursor.execute("""
            SELECT type, COUNT(*) as count
            FROM memory_blocks
            GROUP BY type
        """)

        counts = {}
        for row in cursor.fetchall():
            counts[row['type']] = row['count']

        return counts

    def _get_global_block_counts(self) -> Dict[str, int]:
        """
        Get block counts from global database.

        Returns:
            Dictionary mapping block type to count
        """
        if not self.global_db_path.exists():
            return {}

        try:
            conn = sqlite3.connect(str(self.global_db_path), timeout=5.0)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            counts = self._get_block_counts(cursor)
            conn.close()

            return counts

        except sqlite3.Error as e:
            logger.warning(f"Error reading global memory: {e}")
            return {}

    def _get_last_updated(self, cursor: sqlite3.Cursor) -> Optional[datetime]:
        """
        Get timestamp of most recently updated block.

        Args:
            cursor: SQLite cursor

        Returns:
            Datetime of last update, or None if no blocks
        """
        cursor.execute("""
            SELECT MAX(updated_at) as last_updated
            FROM memory_blocks
        """)

        row = cursor.fetchone()
        if row and row['last_updated']:
            try:
                # Parse ISO format timestamp
                return datetime.fromisoformat(row['last_updated'].replace('Z', '+00:00'))
            except (ValueError, TypeError) as e:
                logger.warning(f"Error parsing timestamp: {e}")
                return None

        return None

    def get_block_summary(self) -> Dict[str, any]:
        """
        Get detailed block summary for debugging.

        Returns:
            Dictionary with detailed block information
        """
        status = self.get_status()

        return {
            "connected": status.connected,
            "scope": status.scope,
            "database": str(status.database_path) if status.database_path else None,
            "total_blocks": status.block_count,
            "by_type": status.block_types,
            "last_updated": status.last_updated.isoformat() if status.last_updated else None,
            "error": status.error_message
        }

    def check_database_health(self) -> Dict[str, any]:
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

_default_bridge: Optional[MemoryBridge] = None
_bridge_lock = Lock()


def get_memory_bridge(project_root: Optional[Path] = None) -> MemoryBridge:
    """
    Get or create the default MemoryBridge instance.

    Args:
        project_root: Optional project root to use

    Returns:
        MemoryBridge instance
    """
    global _default_bridge

    with _bridge_lock:
        if _default_bridge is None:
            _default_bridge = MemoryBridge(project_root=project_root)
        return _default_bridge


def reset_memory_bridge() -> None:
    """Reset the default MemoryBridge instance."""
    global _default_bridge

    with _bridge_lock:
        _default_bridge = None

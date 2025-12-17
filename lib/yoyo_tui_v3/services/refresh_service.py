"""
Refresh Service for periodic data updates.

Coordinates periodic updates across all services using threading.
"""

import time
import threading
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any

from ..models import EventType

logger = logging.getLogger(__name__)


class RefreshService:
    """
    Coordinates periodic refresh of all dashboard services.

    Responsibilities:
    - Background polling loop (daemon thread)
    - Manual refresh on demand ('r' key)
    - Service coordination (DataManager, CommandSuggester, ErrorDetector, MCPServerMonitor)
    - Event publishing after each refresh cycle
    - Error handling and recovery

    Architecture:
    - Uses daemon thread for background polling
    - 10 second default refresh interval
    - Thread-safe operations
    """

    def __init__(
        self,
        event_bus,
        data_manager,
        command_suggester,
        error_detector,
        mcp_monitor,
        memory_bridge=None,
        refresh_interval: int = 10
    ):
        """
        Initialize RefreshService.

        Args:
            event_bus: EventBus instance for publishing events
            data_manager: DataManager instance
            command_suggester: IntelligentCommandSuggester instance
            error_detector: ErrorDetector instance
            mcp_monitor: MCPServerMonitor instance
            memory_bridge: MemoryBridge instance (optional)
            refresh_interval: Seconds between refreshes (default: 10)
        """
        self.event_bus = event_bus
        self.data_manager = data_manager
        self.command_suggester = command_suggester
        self.error_detector = error_detector
        self.mcp_monitor = mcp_monitor
        self.memory_bridge = memory_bridge
        self.refresh_interval = refresh_interval

        # State tracking
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        logger.info(f"RefreshService initialized with {refresh_interval}s interval")

    def start(self) -> None:
        """
        Start background polling loop.

        Creates daemon thread that refreshes data every N seconds.
        If already running, does not create duplicate thread.
        """
        with self._lock:
            if self._running:
                logger.debug("RefreshService already running")
                return

            self._running = True

            # Create daemon thread for background polling
            self._thread = threading.Thread(
                target=self._polling_loop,
                daemon=True,
                name="RefreshService-PollingLoop"
            )
            self._thread.start()

            logger.info("RefreshService started")

    def stop(self, timeout: Optional[float] = None) -> None:
        """
        Stop background polling loop.

        Args:
            timeout: Optional timeout in seconds to wait for thread to finish
        """
        with self._lock:
            if not self._running:
                logger.debug("RefreshService not running")
                return

            self._running = False

        # Wait for thread to finish (outside lock)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)

            if self._thread.is_alive():
                logger.warning("RefreshService thread did not stop within timeout")
            else:
                logger.info("RefreshService stopped")

        self._thread = None

    def refresh_now(self) -> Dict[str, Any]:
        """
        Trigger manual refresh immediately.

        Coordinates all services and publishes STATE_UPDATED event.
        Can be called while polling loop is running (thread-safe).

        Returns:
            Dict with results from all services:
            - suggestions: List of command suggestions
            - errors: List of detected errors
            - mcp_status: MCP server status
        """
        logger.debug("Manual refresh triggered")

        results = {
            "suggestions": [],
            "errors": [],
            "mcp_status": None,
            "memory_status": None
        }

        try:
            # 1. DataManager: Reload specs/tasks/fixes
            try:
                self.data_manager.refresh_all()
                logger.debug("DataManager refreshed")
            except Exception as e:
                logger.error(f"DataManager refresh failed: {e}")

            # 2. CommandSuggester: Update suggestions
            try:
                results["suggestions"] = self.command_suggester.generate_suggestions()
                logger.debug(f"Generated {len(results['suggestions'])} suggestions")
            except Exception as e:
                logger.error(f"CommandSuggester failed: {e}")

            # 3. ErrorDetector: Scan for errors
            try:
                results["errors"] = self.error_detector.detect_all_errors()
                logger.debug(f"Detected {len(results['errors'])} errors")
            except Exception as e:
                logger.error(f"ErrorDetector failed: {e}")

            # 4. MCPServerMonitor: Check MCP status
            try:
                results["mcp_status"] = self.mcp_monitor.check_mcp_status()
                logger.debug("MCP status checked")
            except Exception as e:
                logger.error(f"MCPServerMonitor failed: {e}")

            # 5. MemoryBridge: Check memory status
            if self.memory_bridge:
                try:
                    results["memory_status"] = self.memory_bridge.get_status()
                    logger.debug(f"Memory status: {results['memory_status'].block_count} blocks")
                except Exception as e:
                    logger.error(f"MemoryBridge failed: {e}")

            # Publish STATE_UPDATED event
            self.event_bus.publish(
                EventType.STATE_UPDATED,
                data={
                    "trigger": "manual_refresh",
                    "timestamp": datetime.now().isoformat(),
                    "suggestions_count": len(results["suggestions"]),
                    "errors_count": len(results["errors"])
                },
                source="RefreshService"
            )

            logger.info("Manual refresh completed")

        except Exception as e:
            logger.error(f"Unexpected error during manual refresh: {e}")

        return results

    def _polling_loop(self) -> None:
        """
        Background polling loop (runs in daemon thread).

        Continuously refreshes data every N seconds until stopped.
        Handles errors and continues running.
        """
        logger.debug("Polling loop started")

        while self._running:
            try:
                # Perform refresh cycle
                self._do_refresh_cycle()

                # Sleep for refresh interval (check _running frequently for quick shutdown)
                sleep_elapsed = 0.0
                sleep_interval = 0.1  # Check every 100ms

                while self._running and sleep_elapsed < self.refresh_interval:
                    time.sleep(sleep_interval)
                    sleep_elapsed += sleep_interval

            except Exception as e:
                logger.error(f"Error in polling loop: {e}")

                # Still sleep before next attempt
                time.sleep(self.refresh_interval)

        logger.debug("Polling loop stopped")

    def _do_refresh_cycle(self) -> None:
        """
        Perform one complete refresh cycle.

        Calls all services in order:
        1. DataManager
        2. CommandSuggester
        3. ErrorDetector
        4. MCPServerMonitor

        Then publishes STATE_UPDATED event.
        """
        logger.debug("Starting refresh cycle")

        try:
            # 1. DataManager
            try:
                self.data_manager.refresh_all()
            except Exception as e:
                logger.error(f"DataManager refresh failed: {e}")

            # 2. CommandSuggester
            try:
                suggestions = self.command_suggester.generate_suggestions()
                logger.debug(f"Generated {len(suggestions)} suggestions")
            except Exception as e:
                logger.error(f"CommandSuggester failed: {e}")

            # 3. ErrorDetector
            try:
                errors = self.error_detector.detect_all_errors()
                logger.debug(f"Detected {len(errors)} errors")
            except Exception as e:
                logger.error(f"ErrorDetector failed: {e}")

            # 4. MCPServerMonitor
            try:
                self.mcp_monitor.check_mcp_status()
            except Exception as e:
                logger.error(f"MCPServerMonitor failed: {e}")

            # 5. MemoryBridge (if available)
            if self.memory_bridge:
                try:
                    memory_status = self.memory_bridge.get_status()
                    logger.debug(f"Memory status: {memory_status.block_count} blocks")
                except Exception as e:
                    logger.error(f"MemoryBridge failed: {e}")

            # Publish STATE_UPDATED event
            self.event_bus.publish(
                EventType.STATE_UPDATED,
                data={
                    "trigger": "periodic_refresh",
                    "timestamp": datetime.now().isoformat()
                },
                source="RefreshService"
            )

            logger.debug("Refresh cycle completed")

        except Exception as e:
            logger.error(f"Unexpected error in refresh cycle: {e}")

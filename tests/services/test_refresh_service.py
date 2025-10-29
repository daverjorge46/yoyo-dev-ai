"""
Tests for RefreshService.

Tests cover:
- Background polling loop (10s interval)
- Manual refresh trigger
- Event publishing
- Service coordination
- Thread safety
"""

import time
import pytest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

from lib.yoyo_tui_v3.services.refresh_service import RefreshService
from lib.yoyo_tui_v3.services.event_bus import EventBus
from lib.yoyo_tui_v3.models import EventType


class TestRefreshServiceInit:
    """Test RefreshService initialization."""

    def test_init_stores_dependencies(self):
        """Test that init stores all dependencies."""
        event_bus = Mock(spec=EventBus)
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=10
        )

        assert service.event_bus is event_bus
        assert service.data_manager is data_manager
        assert service.command_suggester is command_suggester
        assert service.error_detector is error_detector
        assert service.mcp_monitor is mcp_monitor
        assert service.refresh_interval == 10

    def test_init_default_interval(self):
        """Test default refresh interval."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        assert service.refresh_interval == 10

    def test_init_sets_stopped_state(self):
        """Test that service starts in stopped state."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        assert service._running is False
        assert service._thread is None


class TestRefreshServiceStart:
    """Test starting the refresh service."""

    def test_start_creates_daemon_thread(self):
        """Test that start() creates a daemon thread."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        service.start()

        assert service._running is True
        assert service._thread is not None
        assert service._thread.daemon is True
        assert service._thread.is_alive() is True

        # Clean up
        service.stop()

    def test_start_does_not_create_duplicate_thread(self):
        """Test that calling start() twice doesn't create duplicate threads."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        service.start()
        first_thread = service._thread

        service.start()  # Call again
        second_thread = service._thread

        assert first_thread is second_thread  # Same thread

        # Clean up
        service.stop()

    def test_start_begins_polling_loop(self):
        """Test that start() begins the polling loop."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.1  # Very short interval for testing
        )

        service.start()

        # Wait for at least one refresh cycle
        time.sleep(0.3)

        # Verify that services were called
        assert data_manager.refresh_all.call_count >= 1

        # Clean up
        service.stop()


class TestRefreshServiceStop:
    """Test stopping the refresh service."""

    def test_stop_sets_running_false(self):
        """Test that stop() sets _running to False."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        service.start()
        assert service._running is True

        service.stop()
        assert service._running is False

    def test_stop_joins_thread(self):
        """Test that stop() waits for thread to finish."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.1
        )

        service.start()
        thread = service._thread

        service.stop()

        # Thread should be stopped
        assert thread.is_alive() is False

    def test_stop_with_timeout(self):
        """Test that stop() respects timeout parameter."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=10  # Long interval
        )

        service.start()

        # Stop with short timeout
        service.stop(timeout=0.5)

        # Should complete within timeout

    def test_stop_when_not_started(self):
        """Test that stop() works when service not started."""
        event_bus = Mock()
        data_manager = Mock()
        command_suggester = Mock()
        error_detector = Mock()
        mcp_monitor = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        # Should not raise an error
        service.stop()

        assert service._running is False


class TestRefreshServiceRefreshNow:
    """Test manual refresh trigger."""

    def test_refresh_now_calls_all_services(self):
        """Test that refresh_now() calls all service methods."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        service.refresh_now()

        # Verify all services were called
        data_manager.refresh_all.assert_called_once()
        command_suggester.generate_suggestions.assert_called_once()
        error_detector.detect_all_errors.assert_called_once()
        mcp_monitor.check_mcp_status.assert_called_once()

    def test_refresh_now_publishes_event(self):
        """Test that refresh_now() publishes STATE_UPDATED event."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        service.refresh_now()

        # Verify event was published
        event_bus.publish.assert_called_once()
        call_args = event_bus.publish.call_args
        assert call_args[0][0] == EventType.STATE_UPDATED
        assert call_args[1]["source"] == "RefreshService"

    def test_refresh_now_returns_results(self):
        """Test that refresh_now() returns service results."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()

        suggestions = [Mock()]
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=suggestions)

        errors = [Mock(), Mock()]
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=errors)

        mcp_status = Mock()
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock(return_value=mcp_status)

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        result = service.refresh_now()

        assert result["suggestions"] == suggestions
        assert result["errors"] == errors
        assert result["mcp_status"] == mcp_status

    def test_refresh_now_handles_exceptions(self):
        """Test that refresh_now() handles service exceptions gracefully."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock(side_effect=Exception("Test error"))
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        # Should not raise exception
        result = service.refresh_now()

        # Other services should still be called
        command_suggester.generate_suggestions.assert_called_once()
        error_detector.detect_all_errors.assert_called_once()
        mcp_monitor.check_mcp_status.assert_called_once()


class TestRefreshServicePollingLoop:
    """Test the background polling loop."""

    def test_polling_loop_respects_interval(self):
        """Test that polling loop respects refresh interval."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.2  # 200ms interval
        )

        service.start()

        # Wait for ~2 intervals
        time.sleep(0.5)

        # Should have called refresh 2-3 times
        call_count = data_manager.refresh_all.call_count
        assert 2 <= call_count <= 3

        service.stop()

    def test_polling_loop_publishes_events(self):
        """Test that polling loop publishes STATE_UPDATED events."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.1
        )

        service.start()

        # Wait for at least one cycle
        time.sleep(0.3)

        # Should have published at least one event
        assert event_bus.publish.call_count >= 1

        # Verify event type
        call_args = event_bus.publish.call_args_list[0]
        assert call_args[0][0] == EventType.STATE_UPDATED

        service.stop()

    def test_polling_loop_handles_service_errors(self):
        """Test that polling loop continues after service errors."""
        event_bus = Mock()
        data_manager = Mock()

        # First call fails, second succeeds
        data_manager.refresh_all = Mock(side_effect=[Exception("Test error"), None])

        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.1
        )

        service.start()

        # Wait for multiple cycles
        time.sleep(0.3)

        # Should have attempted multiple refreshes despite error
        assert data_manager.refresh_all.call_count >= 2

        service.stop()

    def test_polling_loop_stops_cleanly(self):
        """Test that polling loop stops cleanly when stop() called."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.1
        )

        service.start()
        time.sleep(0.2)

        call_count_before_stop = data_manager.refresh_all.call_count

        service.stop()
        time.sleep(0.3)  # Wait to ensure no more calls

        call_count_after_stop = data_manager.refresh_all.call_count

        # Should not have additional calls after stop
        assert call_count_after_stop == call_count_before_stop


class TestRefreshServiceCoordination:
    """Test coordination between services."""

    def test_refresh_order(self):
        """Test that services are called in correct order."""
        event_bus = Mock()

        call_order = []

        data_manager = Mock()
        data_manager.refresh_all = Mock(side_effect=lambda: call_order.append("data_manager"))

        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(
            side_effect=lambda: call_order.append("command_suggester") or []
        )

        error_detector = Mock()
        error_detector.detect_all_errors = Mock(
            side_effect=lambda: call_order.append("error_detector") or []
        )

        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock(
            side_effect=lambda: call_order.append("mcp_monitor")
        )

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        service.refresh_now()

        # Verify call order
        assert call_order == [
            "data_manager",
            "command_suggester",
            "error_detector",
            "mcp_monitor"
        ]

    def test_partial_service_failure(self):
        """Test that failure in one service doesn't stop others."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()

        # Command suggester fails
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(side_effect=Exception("Test error"))

        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])

        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        # Should not raise exception
        result = service.refresh_now()

        # Other services should still run
        data_manager.refresh_all.assert_called_once()
        error_detector.detect_all_errors.assert_called_once()
        mcp_monitor.check_mcp_status.assert_called_once()


class TestRefreshServiceThreadSafety:
    """Test thread safety of refresh service."""

    def test_concurrent_refresh_now_calls(self):
        """Test that multiple concurrent refresh_now() calls are safe."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor
        )

        import threading

        # Run multiple refresh_now() calls concurrently
        threads = []
        for _ in range(5):
            t = threading.Thread(target=service.refresh_now)
            t.start()
            threads.append(t)

        for t in threads:
            t.join()

        # All calls should complete successfully
        assert data_manager.refresh_all.call_count == 5

    def test_refresh_now_during_polling(self):
        """Test that manual refresh_now() works while polling loop runs."""
        event_bus = Mock()
        data_manager = Mock()
        data_manager.refresh_all = Mock()
        command_suggester = Mock()
        command_suggester.generate_suggestions = Mock(return_value=[])
        error_detector = Mock()
        error_detector.detect_all_errors = Mock(return_value=[])
        mcp_monitor = Mock()
        mcp_monitor.check_mcp_status = Mock()

        service = RefreshService(
            event_bus=event_bus,
            data_manager=data_manager,
            command_suggester=command_suggester,
            error_detector=error_detector,
            mcp_monitor=mcp_monitor,
            refresh_interval=0.5  # Longer interval
        )

        service.start()

        # Trigger manual refresh
        service.refresh_now()
        service.refresh_now()

        time.sleep(0.2)

        service.stop()

        # Should have at least 2 manual refreshes plus any background refreshes
        assert data_manager.refresh_all.call_count >= 2

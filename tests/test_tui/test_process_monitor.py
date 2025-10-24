#!/usr/bin/env python3
"""
Test ProcessMonitor service for tracking running processes.

Tests log parsing, process registration, progress tracking, and event emission.
"""

import sys
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


def test_process_status_model():
    """Test ProcessStatus dataclass."""
    from yoyo_tui.models import ProcessStatus

    process = ProcessStatus(
        pid=12345,
        command="/execute-tasks",
        spec_name="user-auth",
        status="running",
        progress=50,
        current_task="Task 2: Implement authentication"
    )

    assert process.pid == 12345
    assert process.command == "/execute-tasks"
    assert process.is_running is True
    assert process.progress == 50
    assert "user-auth" in process.display_name


def test_process_status_completion():
    """Test ProcessStatus when completed."""
    from yoyo_tui.models import ProcessStatus

    process = ProcessStatus(
        pid=12345,
        command="/execute-tasks",
        spec_name="user-auth",
        status="completed",
        progress=100
    )

    assert process.is_running is False
    assert process.status == "completed"


def test_log_format_definition():
    """Test that log format is well-defined."""
    # Log format: YOYO_PROCESS_<EVENT>:<PID>:<DATA>

    # Sample log lines
    start_log = "YOYO_PROCESS_START:12345:spec-name=user-auth,command=/execute-tasks"
    progress_log = "YOYO_PROCESS_PROGRESS:12345:progress=50,task=Task 2"
    complete_log = "YOYO_PROCESS_COMPLETE:12345:status=success"

    # Verify format structure
    for log_line in [start_log, progress_log, complete_log]:
        parts = log_line.split(':', 2)
        assert len(parts) == 3
        assert parts[0].startswith("YOYO_PROCESS_")
        assert parts[1].isdigit()  # PID is numeric


def test_process_monitor_initialization():
    """Test ProcessMonitor initialization."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    assert monitor.event_bus is event_bus
    assert isinstance(monitor.processes, dict)
    assert len(monitor.processes) == 0


def test_process_monitor_parse_start_event():
    """Test parsing YOYO_PROCESS_START log line."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    log_line = "YOYO_PROCESS_START:12345:spec-name=user-auth,command=/execute-tasks"

    event_type, pid, data = monitor._parse_log_line(log_line)

    assert event_type == "START"
    assert pid == 12345
    assert "spec-name" in data
    assert data["spec-name"] == "user-auth"
    assert data["command"] == "/execute-tasks"


def test_process_monitor_parse_progress_event():
    """Test parsing YOYO_PROCESS_PROGRESS log line."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    log_line = "YOYO_PROCESS_PROGRESS:12345:progress=50,task=Task 2: Implement auth"

    event_type, pid, data = monitor._parse_log_line(log_line)

    assert event_type == "PROGRESS"
    assert pid == 12345
    assert data["progress"] == "50"
    assert "Task 2" in data["task"]


def test_process_monitor_parse_complete_event():
    """Test parsing YOYO_PROCESS_COMPLETE log line."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    log_line = "YOYO_PROCESS_COMPLETE:12345:status=success"

    event_type, pid, data = monitor._parse_log_line(log_line)

    assert event_type == "COMPLETE"
    assert pid == 12345
    assert data["status"] == "success"


def test_process_monitor_register_process():
    """Test registering a new process."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus, EventType

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    # Track events
    events_received = []
    event_bus.subscribe(EventType.PROCESS_STARTED, lambda e: events_received.append(e))

    # Register process
    monitor.register_process(
        pid=12345,
        command="/execute-tasks",
        spec_name="user-auth"
    )

    # Verify process registered
    assert 12345 in monitor.processes
    assert monitor.processes[12345].command == "/execute-tasks"
    assert monitor.processes[12345].spec_name == "user-auth"
    assert monitor.processes[12345].is_running is True

    # Verify event emitted
    assert len(events_received) == 1
    assert events_received[0].event_type == EventType.PROCESS_STARTED


def test_process_monitor_update_progress():
    """Test updating process progress."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus, EventType

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    # Register process first
    monitor.register_process(12345, "/execute-tasks", "user-auth")

    # Track events
    events_received = []
    event_bus.subscribe(EventType.PROCESS_PROGRESS, lambda e: events_received.append(e))

    # Update progress
    monitor.update_progress(
        pid=12345,
        progress=50,
        current_task="Task 2: Implement authentication"
    )

    # Verify progress updated
    assert monitor.processes[12345].progress == 50
    assert monitor.processes[12345].current_task == "Task 2: Implement authentication"

    # Verify event emitted
    assert len(events_received) == 1
    assert events_received[0].event_type == EventType.PROCESS_PROGRESS


def test_process_monitor_complete_process():
    """Test completing a process."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus, EventType

    event_bus = EventBus(enable_logging=False)
    monitor = ProcessMonitor(event_bus=event_bus)

    # Register process first
    monitor.register_process(12345, "/execute-tasks", "user-auth")

    # Track events
    events_received = []
    event_bus.subscribe(EventType.PROCESS_COMPLETED, lambda e: events_received.append(e))

    # Complete process
    monitor.complete_process(pid=12345, status="success")

    # Verify process completed
    assert monitor.processes[12345].status == "completed"
    assert monitor.processes[12345].is_running is False
    assert monitor.processes[12345].completed_at is not None

    # Verify event emitted
    assert len(events_received) == 1
    assert events_received[0].event_type == EventType.PROCESS_COMPLETED


def test_process_monitor_handles_log_file():
    """Test ProcessMonitor can read from log file."""
    from yoyo_tui.services.process_monitor import ProcessMonitor
    from yoyo_tui.services.event_bus import EventBus

    # Create temp log file
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.log') as f:
        f.write("YOYO_PROCESS_START:12345:spec-name=user-auth,command=/execute-tasks\n")
        f.write("YOYO_PROCESS_PROGRESS:12345:progress=50,task=Task 2\n")
        f.write("YOYO_PROCESS_COMPLETE:12345:status=success\n")
        log_file = Path(f.name)

    try:
        event_bus = EventBus(enable_logging=False)
        monitor = ProcessMonitor(event_bus=event_bus, log_file=log_file)

        # Process log file
        monitor.process_log_file()

        # Verify process was registered and completed
        assert 12345 in monitor.processes
        assert monitor.processes[12345].progress == 100  # Set to 100 on completion
        assert monitor.processes[12345].status == "completed"
        assert monitor.processes[12345].current_task == "Task 2"  # Task updated during progress

    finally:
        log_file.unlink(missing_ok=True)


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v', '-s'])

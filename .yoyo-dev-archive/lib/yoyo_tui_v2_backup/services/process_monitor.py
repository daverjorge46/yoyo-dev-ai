"""
ProcessMonitor Service - Track running /execute-tasks processes.

Monitors /tmp/yoyo-process.log for process events and emits EventBus notifications.
"""

import logging
from pathlib import Path
from typing import Dict, Tuple, Optional
from datetime import datetime

from ..models import ProcessStatus
from .event_bus import EventBus, EventType

logger = logging.getLogger(__name__)


class ProcessMonitor:
    """
    Monitor long-running processes via log file.

    Bash scripts write events to /tmp/yoyo-process.log in format:
    YOYO_PROCESS_<EVENT>:<PID>:<DATA>

    Events:
    - START: Process started (spec-name, command)
    - PROGRESS: Progress update (progress %, current task)
    - COMPLETE: Process completed (status: success/failed)

    Emits EventBus events:
    - PROCESS_STARTED
    - PROCESS_PROGRESS
    - PROCESS_COMPLETED
    """

    def __init__(
        self,
        event_bus: EventBus,
        log_file: Path = Path("/tmp/yoyo-process.log")
    ):
        """
        Initialize ProcessMonitor.

        Args:
            event_bus: EventBus instance for event emission
            log_file: Path to process log file (default: /tmp/yoyo-process.log)
        """
        self.event_bus = event_bus
        self.log_file = log_file
        self.processes: Dict[int, ProcessStatus] = {}

        logger.info(f"ProcessMonitor initialized, watching: {log_file}")

    def _parse_log_line(self, line: str) -> Tuple[Optional[str], Optional[int], Dict[str, str]]:
        """
        Parse log line in format: YOYO_PROCESS_<EVENT>:<PID>:<DATA>

        Args:
            line: Log line to parse

        Returns:
            Tuple of (event_type, pid, data_dict)
            Returns (None, None, {}) if line doesn't match format
        """
        line = line.strip()

        # Check if line starts with YOYO_PROCESS_
        if not line.startswith("YOYO_PROCESS_"):
            return (None, None, {})

        try:
            # Split into parts: YOYO_PROCESS_EVENT:PID:DATA
            parts = line.split(':', 2)
            if len(parts) < 3:
                return (None, None, {})

            # Extract event type (e.g., "START" from "YOYO_PROCESS_START")
            event_type = parts[0].replace("YOYO_PROCESS_", "")

            # Extract PID
            pid = int(parts[1])

            # Parse data (format: key1=value1,key2=value2)
            data = {}
            if parts[2]:
                for pair in parts[2].split(','):
                    if '=' in pair:
                        key, value = pair.split('=', 1)
                        data[key.strip()] = value.strip()

            return (event_type, pid, data)

        except (ValueError, IndexError) as e:
            logger.warning(f"Failed to parse log line: {line}, error: {e}")
            return (None, None, {})

    def register_process(
        self,
        pid: int,
        command: str,
        spec_name: str
    ) -> None:
        """
        Register a new process.

        Args:
            pid: Process ID
            command: Command being executed
            spec_name: Spec or fix name
        """
        process = ProcessStatus(
            pid=pid,
            command=command,
            spec_name=spec_name,
            status="running",
            progress=0,
            started_at=datetime.now().isoformat()
        )

        self.processes[pid] = process

        # Emit PROCESS_STARTED event
        self.event_bus.publish(
            EventType.PROCESS_STARTED,
            {
                "pid": pid,
                "command": command,
                "spec_name": spec_name
            },
            source="ProcessMonitor"
        )

        logger.info(f"Process registered: PID={pid}, command={command}, spec={spec_name}")

    def update_progress(
        self,
        pid: int,
        progress: int,
        current_task: Optional[str] = None
    ) -> None:
        """
        Update process progress.

        Args:
            pid: Process ID
            progress: Progress percentage (0-100)
            current_task: Current task description
        """
        if pid not in self.processes:
            logger.warning(f"Cannot update progress for unknown PID: {pid}")
            return

        process = self.processes[pid]
        process.progress = progress
        if current_task:
            process.current_task = current_task

        # Emit PROCESS_PROGRESS event
        self.event_bus.publish(
            EventType.PROCESS_PROGRESS,
            {
                "pid": pid,
                "progress": progress,
                "current_task": current_task
            },
            source="ProcessMonitor"
        )

        logger.debug(f"Process progress updated: PID={pid}, progress={progress}%")

    def complete_process(
        self,
        pid: int,
        status: str = "success"
    ) -> None:
        """
        Mark process as completed.

        Args:
            pid: Process ID
            status: Completion status (success/failed)
        """
        if pid not in self.processes:
            logger.warning(f"Cannot complete unknown PID: {pid}")
            return

        process = self.processes[pid]
        process.status = "completed" if status == "success" else "failed"
        process.completed_at = datetime.now().isoformat()
        process.progress = 100 if status == "success" else process.progress

        # Emit PROCESS_COMPLETED event
        self.event_bus.publish(
            EventType.PROCESS_COMPLETED,
            {
                "pid": pid,
                "status": status,
                "spec_name": process.spec_name
            },
            source="ProcessMonitor"
        )

        logger.info(f"Process completed: PID={pid}, status={status}")

    def process_log_file(self) -> None:
        """
        Process log file and update process states.

        Reads all lines from log file and handles events.
        """
        if not self.log_file.exists():
            logger.debug(f"Log file does not exist: {self.log_file}")
            return

        try:
            with open(self.log_file, 'r') as f:
                for line in f:
                    event_type, pid, data = self._parse_log_line(line)

                    if event_type is None:
                        continue

                    # Handle event
                    if event_type == "START":
                        spec_name = data.get("spec-name", "unknown")
                        command = data.get("command", "/execute-tasks")
                        self.register_process(pid, command, spec_name)

                    elif event_type == "PROGRESS":
                        progress = int(data.get("progress", 0))
                        task = data.get("task")
                        self.update_progress(pid, progress, task)

                    elif event_type == "COMPLETE":
                        status = data.get("status", "success")
                        self.complete_process(pid, status)

        except Exception as e:
            logger.error(f"Error processing log file: {e}")

    def get_active_processes(self) -> list[ProcessStatus]:
        """
        Get list of currently running processes.

        Returns:
            List of ProcessStatus for running processes
        """
        return [p for p in self.processes.values() if p.is_running]

    def get_all_processes(self) -> list[ProcessStatus]:
        """
        Get list of all processes (running and completed).

        Returns:
            List of all ProcessStatus objects
        """
        return list(self.processes.values())

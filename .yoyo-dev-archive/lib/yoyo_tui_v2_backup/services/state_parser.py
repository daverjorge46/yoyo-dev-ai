"""
StateParser Service

Parses state.json files from spec/fix workflows to extract workflow state.
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any


class StateParser:
    """
    Parse state.json files to extract workflow state.

    Handles:
    - Current workflow phase
    - Workflow status
    - Timestamps
    - Metadata
    """

    @staticmethod
    def parse(state_file: Path) -> Optional[Dict[str, Any]]:
        """
        Parse state.json file.

        Args:
            state_file: Path to state.json

        Returns:
            Parsed state dictionary or None if file doesn't exist/is malformed
        """
        if not state_file.exists():
            return None

        try:
            with open(state_file, 'r') as f:
                content = f.read().strip()

            # Handle empty file
            if not content:
                return None

            return json.loads(content)

        except (json.JSONDecodeError, IOError):
            return None

    @staticmethod
    def get_current_phase(state_file: Path) -> str:
        """
        Get current workflow phase from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Current phase or empty string if not found

        Possible phases:
            - spec_creation
            - ready_for_tasks
            - ready_for_execution
            - implementation
            - testing
            - completed
        """
        state = StateParser.parse(state_file)
        if state and 'current_phase' in state:
            return state['current_phase']
        return ''

    @staticmethod
    def get_workflow_status(state_file: Path) -> str:
        """
        Get workflow status from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Workflow status or "unknown" if not found

        Possible statuses:
            - pending
            - in_progress
            - blocked
            - completed
        """
        state = StateParser.parse(state_file)
        if state and 'status' in state:
            return state['status']
        return 'unknown'

    @staticmethod
    def is_workflow_complete(state_file: Path) -> bool:
        """
        Check if workflow is marked as complete.

        Args:
            state_file: Path to state.json

        Returns:
            True if workflow is complete, False otherwise
        """
        phase = StateParser.get_current_phase(state_file)
        return phase == 'completed'

    @staticmethod
    def is_ready_for_execution(state_file: Path) -> bool:
        """
        Check if workflow is ready for task execution.

        Args:
            state_file: Path to state.json

        Returns:
            True if ready for execution, False otherwise
        """
        phase = StateParser.get_current_phase(state_file)
        return phase in ['ready_for_execution', 'implementation']

    @staticmethod
    def get_spec_name(state_file: Path) -> str:
        """
        Get spec/fix name from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Spec name or empty string if not found
        """
        state = StateParser.parse(state_file)
        if state and 'spec_name' in state:
            return state['spec_name']
        return ''

    @staticmethod
    def get_workflow_type(state_file: Path) -> str:
        """
        Get workflow type from state.json.

        Args:
            state_file: Path to state.json

        Returns:
            Workflow type or empty string if not found

        Possible types:
            - create-new
            - create-spec
            - create-fix
        """
        state = StateParser.parse(state_file)
        if state and 'workflow' in state:
            return state['workflow']
        return ''

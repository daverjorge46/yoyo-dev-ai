"""
Workflow Expander Module

Expands workflow references in agent files using {{workflows/*}} syntax.
Supports nested references up to 3 levels deep with cycle detection.
"""

import re
from pathlib import Path
from typing import List, Set


class WorkflowExpander:
    """
    Expand workflow references in agent files.

    Features:
    - Parse {{workflows/path/to/workflow.md}} references
    - Expand nested references (max 3 levels)
    - Detect circular references
    - Cache expanded workflows for performance
    - Path validation for security
    """

    MAX_DEPTH = 3
    REFERENCE_PATTERN = r'\{\{workflows/([^}]+)\}\}'

    def __init__(self, workflows_dir: Path):
        """
        Initialize WorkflowExpander.

        Args:
            workflows_dir: Path to workflows directory
        """
        self.workflows_dir = Path(workflows_dir)
        self._cache = {}

    def expand(self, content: str, depth: int = 0, visited: Set[str] = None) -> str:
        """
        Expand all workflow references in content.

        Args:
            content: Content with workflow references
            depth: Current nesting depth
            visited: Set of already visited workflows (for cycle detection)

        Returns:
            Content with all references expanded

        Raises:
            ValueError: If max depth exceeded or circular reference detected
            FileNotFoundError: If workflow file not found
        """
        if visited is None:
            visited = set()

        # Check max depth
        if depth > self.MAX_DEPTH:
            raise ValueError(
                f"Maximum nesting depth ({self.MAX_DEPTH}) exceeded. "
                "Check for deeply nested workflow references."
            )

        # Parse references
        references = self.parse_references(content)

        if not references:
            return content

        # Expand each reference
        result = content
        for ref in references:
            # Check for circular reference
            if ref in visited:
                raise ValueError(
                    f"Circular reference detected: {ref} was already visited. "
                    f"Visit chain: {' -> '.join(visited)} -> {ref}"
                )

            # Load workflow content
            workflow_content = self._load_workflow(ref)

            # Add to visited set for this expansion branch
            new_visited = visited.copy()
            new_visited.add(ref)

            # Recursively expand nested references
            expanded_content = self.expand(
                workflow_content,
                depth=depth + 1,
                visited=new_visited
            )

            # Replace reference with expanded content
            pattern = r'\{\{' + re.escape(ref) + r'\}\}'
            result = re.sub(pattern, expanded_content, result, count=1)

        return result

    def parse_references(self, content: str) -> List[str]:
        """
        Parse workflow references from content.

        Args:
            content: Content to parse

        Returns:
            List of workflow references (e.g., ["workflows/simple.md"])
        """
        matches = re.findall(self.REFERENCE_PATTERN, content)
        return [f"workflows/{match}" for match in matches]

    def _load_workflow(self, workflow_ref: str) -> str:
        """
        Load workflow file content.

        Args:
            workflow_ref: Workflow reference (e.g., "workflows/simple.md")

        Returns:
            Workflow file content

        Raises:
            FileNotFoundError: If workflow file not found
            ValueError: If workflow path is invalid
        """
        # Check cache first
        if workflow_ref in self._cache:
            return self._cache[workflow_ref]

        # Validate path (security check)
        self._validate_path(workflow_ref)

        # Remove "workflows/" prefix for file path
        relative_path = workflow_ref.replace("workflows/", "")
        workflow_path = self.workflows_dir / relative_path

        # Check if file exists
        if not workflow_path.exists():
            raise FileNotFoundError(
                f"Workflow file not found: {workflow_path}\n"
                f"Reference: {workflow_ref}"
            )

        # Load content
        with open(workflow_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Cache for performance
        self._cache[workflow_ref] = content

        return content

    def _validate_path(self, workflow_ref: str) -> None:
        """
        Validate workflow path for security.

        Args:
            workflow_ref: Workflow reference to validate

        Raises:
            ValueError: If path contains invalid characters or attempts directory traversal
        """
        # Check for directory traversal attempts
        if ".." in workflow_ref or workflow_ref.startswith("/"):
            raise ValueError(
                f"Invalid workflow path: {workflow_ref}\n"
                "Path must not contain '..' or start with '/'"
            )

        # Check for invalid characters
        invalid_chars = ["\\", "\0", "|", "&", ";", ">", "<", "`", "$"]
        for char in invalid_chars:
            if char in workflow_ref:
                raise ValueError(
                    f"Invalid workflow path: {workflow_ref}\n"
                    f"Path contains invalid character: {char}"
                )

    def clear_cache(self) -> None:
        """Clear the workflow cache."""
        self._cache.clear()

    def get_cache_size(self) -> int:
        """
        Get the number of cached workflows.

        Returns:
            Number of workflows in cache
        """
        return len(self._cache)


def expand_agent_file(agent_path: Path, workflows_dir: Path) -> str:
    """
    Convenience function to expand an entire agent file.

    Args:
        agent_path: Path to agent file
        workflows_dir: Path to workflows directory

    Returns:
        Agent file content with all workflow references expanded
    """
    expander = WorkflowExpander(workflows_dir)

    with open(agent_path, 'r', encoding='utf-8') as f:
        content = f.read()

    return expander.expand(content)

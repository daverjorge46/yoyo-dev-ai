# Python Development Expert

Build **Python applications** with venvs, Textual TUIs, async patterns, and modern tooling.

**Keywords:** python, pip, venv, virtualenv, requirements.txt, textual, rich, asyncio, pytest, import error, module not found

## When to use this skill

Use this skill when:
- Creating or managing Python virtual environments
- Working with Python dependencies and requirements.txt
- Building Textual TUI (Terminal User Interface) applications
- Debugging Python import errors or module issues
- Writing Python scripts for automation or CLI tools
- Need help with Python project structure
- Working with asyncio or event-driven code
- Implementing data models, parsers, or services

## What I'll help with

- **Virtual Environments**: Creating, activating, managing venvs
- **Dependencies**: pip, requirements.txt, version pinning
- **Textual Framework**: Building rich terminal UIs with Textual
- **TUI Components**: Screens, widgets, reactive programming
- **Python Best Practices**: Type hints, docstrings, PEP 8
- **Error Handling**: Exception handling, logging, debugging
- **Testing**: pytest, unit tests, integration tests
- **Async/Await**: Event loops, async functions, concurrency

## Key Expertise

- Python 3.8+ features and best practices
- Textual framework (v0.45.0+) for TUI development
- Rich library for terminal formatting
- Virtual environment troubleshooting (broken shebangs, path issues)
- Dependency resolution and version conflicts
- Python packaging and distribution
- Type safety with type hints and mypy
- Reactive programming patterns

## Examples

**Virtual environment validation:**
```python
def validate_venv_python(venv_path: str) -> bool:
    """Check if venv has valid Python interpreter."""
    pip_path = venv_path / "bin" / "pip"
    if not pip_path.exists():
        return False

    # Read shebang
    with open(pip_path, 'r') as f:
        shebang = f.readline().strip()

    python_path = shebang.replace("#!/", "")
    return Path(python_path).exists()
```

**Textual widget with reactive state:**
```python
from textual.app import ComposeResult
from textual.widgets import Static
from textual.reactive import reactive

class StatusDisplay(Static):
    """Display status with reactive updates."""

    status: reactive[str] = reactive("idle")

    def watch_status(self, new_status: str) -> None:
        """React to status changes."""
        self.update(f"Status: {new_status}")
```

**Dependency management:**
```python
# requirements.txt
textual>=0.45.0
rich>=13.0.0
watchdog>=4.0.0
pyyaml>=6.0
```

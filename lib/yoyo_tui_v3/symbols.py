"""
Symbol System for Yoyo Dev TUI

Provides visual symbols for instant status comprehension.
Replaces text prefixes like [SUCCESS], [ERROR], [INFO] with symbols.
"""

from typing import Optional
from rich.text import Text
from rich.style import Style

# Symbol definitions
SYMBOLS = {
    "check": "✓",
    "cross": "✗",
    "arrow": "→",
    "bullet": "•",
    "info": "ℹ",
    "warn": "⚠",
    "star": "★",
    "lightning": "⚡",
    "bell": "🔔",
    "dev": "🔧",
    "pending": "○",
    "running": "●",
    "folder": "📁",
    "file": "📄",
    "rocket": "🚀",
    "hourglass": "⏳",
}

# Color mappings for each symbol
SYMBOL_COLORS = {
    "check": "green",
    "cross": "red",
    "arrow": "cyan",
    "lightning": "yellow",
    "bell": "magenta",
    "info": "blue",
    "warn": "yellow",
    "star": "bright_yellow",
    "dev": "cyan",
    "pending": "dim",
    "running": "green",
    "bullet": "white",
    "folder": "blue",
    "file": "white",
    "rocket": "bright_cyan",
    "hourglass": "yellow",
}

# Status symbol mappings
STATUS_SYMBOLS = {
    "completed": "check",
    "success": "check",
    "failed": "cross",
    "error": "cross",
    "in_progress": "arrow",
    "active": "arrow",
    "pending": "pending",
    "queued": "pending",
    "running": "running",
    "idle": "hourglass",
    "warning": "warn",
    "info": "info",
}


def get_symbol(
    name: str,
    color: Optional[str] = None,
    bold: bool = False
) -> str:
    """
    Get a symbol by name with optional color override.

    Args:
        name: Symbol name (e.g., "check", "cross", "arrow")
        color: Optional color override
        bold: Whether to make symbol bold

    Returns:
        Symbol character

    Examples:
        >>> get_symbol("check")
        "✓"
        >>> get_symbol("cross", color="bright_red")
        "✗"
    """
    return SYMBOLS.get(name, "•")


def get_symbol_rich(
    name: str,
    color: Optional[str] = None,
    bold: bool = False
) -> Text:
    """
    Get a Rich Text symbol with styling.

    Args:
        name: Symbol name
        color: Optional color override (uses default if None)
        bold: Whether to make symbol bold

    Returns:
        Rich Text object with styled symbol

    Examples:
        >>> get_symbol_rich("check")
        Text("✓", style="green")
        >>> get_symbol_rich("cross", color="bright_red", bold=True)
        Text("✗", style="bold bright_red")
    """
    symbol = SYMBOLS.get(name, "•")
    symbol_color = color or SYMBOL_COLORS.get(name, "white")

    style_str = symbol_color
    if bold:
        style_str = f"bold {style_str}"

    return Text(symbol, style=style_str)


def get_status_symbol(
    status: str,
    color: Optional[str] = None,
    bold: bool = False
) -> Text:
    """
    Get a symbol for a status string.

    Args:
        status: Status string (e.g., "completed", "error", "pending")
        color: Optional color override
        bold: Whether to make symbol bold

    Returns:
        Rich Text object with styled symbol

    Examples:
        >>> get_status_symbol("completed")
        Text("✓", style="green")
        >>> get_status_symbol("error")
        Text("✗", style="red")
        >>> get_status_symbol("in_progress")
        Text("→", style="cyan")
    """
    symbol_name = STATUS_SYMBOLS.get(status.lower(), "bullet")
    return get_symbol_rich(symbol_name, color=color, bold=bold)


def format_with_symbol(
    text: str,
    symbol_name: str,
    color: Optional[str] = None,
    bold: bool = False
) -> Text:
    """
    Format text with a leading symbol.

    Args:
        text: Text to format
        symbol_name: Symbol to prepend
        color: Optional color for symbol
        bold: Whether to make symbol bold

    Returns:
        Rich Text object with symbol + text

    Examples:
        >>> format_with_symbol("All tests passing", "check")
        Text("✓ All tests passing")
        >>> format_with_symbol("Test failed", "cross", color="bright_red")
        Text("✗ Test failed")
    """
    symbol = get_symbol_rich(symbol_name, color=color, bold=bold)
    symbol.append(" ")
    symbol.append(text, style="default")
    return symbol


def format_status_line(
    text: str,
    status: str,
    color: Optional[str] = None,
    bold: bool = False
) -> Text:
    """
    Format a status line with appropriate symbol.

    Args:
        text: Text content
        status: Status string
        color: Optional color override
        bold: Whether to make symbol bold

    Returns:
        Rich Text object with status symbol + text

    Examples:
        >>> format_status_line("All tests passing (12/12)", "completed")
        Text("✓ All tests passing (12/12)")
        >>> format_status_line("Test failed: auth.test.ts", "error")
        Text("✗ Test failed: auth.test.ts")
    """
    symbol = get_status_symbol(status, color=color, bold=bold)
    symbol.append(" ")
    symbol.append(text, style="default")
    return symbol


def format_indented_line(
    text: str,
    level: int = 1,
    symbol: Optional[str] = None,
    use_tree: bool = False
) -> Text:
    """
    Format an indented line with optional symbol.

    Args:
        text: Text content
        level: Indentation level (number of spaces = level * 2)
        symbol: Optional symbol name
        use_tree: Use tree formatting (└─) instead of spaces

    Returns:
        Rich Text object with indentation + optional symbol + text

    Examples:
        >>> format_indented_line("Loaded spec-lite.md", level=1, symbol="check")
        Text("  ✓ Loaded spec-lite.md")
        >>> format_indented_line("156 lines loaded", level=2, use_tree=True)
        Text("    └─ 156 lines loaded")
    """
    result = Text()

    # Add indentation
    indent = "  " * level

    if use_tree:
        # Use tree characters for hierarchical display
        result.append(indent[:-2] if len(indent) > 2 else "")
        result.append("└─ ", style="dim")
    else:
        result.append(indent)

    # Add symbol if provided
    if symbol:
        symbol_text = get_symbol_rich(symbol)
        result.append(symbol_text)
        result.append(" ")

    # Add text
    result.append(text, style="default")

    return result


def get_all_symbols() -> dict[str, str]:
    """
    Get all available symbols.

    Returns:
        Dictionary of symbol name to character mappings
    """
    return SYMBOLS.copy()


def get_symbol_help() -> Text:
    """
    Get help text showing all symbols and their meanings.

    Returns:
        Rich Text object with symbol reference
    """
    help_text = Text()

    help_text.append("Symbol Reference\n\n", style="bold cyan")

    # Status symbols
    help_text.append("Status:\n", style="bold")
    help_text.append(get_symbol_rich("check"))
    help_text.append(" Completed/Success\n")
    help_text.append(get_symbol_rich("cross"))
    help_text.append(" Failed/Error\n")
    help_text.append(get_symbol_rich("arrow"))
    help_text.append(" In Progress/Active\n")
    help_text.append(get_symbol_rich("pending"))
    help_text.append(" Pending/Queued\n")
    help_text.append(get_symbol_rich("hourglass"))
    help_text.append(" Idle/Waiting\n\n")

    # Notification symbols
    help_text.append("Notifications:\n", style="bold")
    help_text.append(get_symbol_rich("bell"))
    help_text.append(" Background task completion\n")
    help_text.append(get_symbol_rich("warn"))
    help_text.append(" Warning\n")
    help_text.append(get_symbol_rich("info"))
    help_text.append(" Information\n\n")

    # Activity symbols
    help_text.append("Activity:\n", style="bold")
    help_text.append(get_symbol_rich("lightning"))
    help_text.append(" Tool execution\n")
    help_text.append(get_symbol_rich("dev"))
    help_text.append(" Development/Build\n")
    help_text.append(get_symbol_rich("rocket"))
    help_text.append(" Launch/Deploy\n")

    return help_text

"""
Header rendering utilities for Yoyo Dev TUI panels.

Provides consistent header styling with box-drawing characters.
"""

from rich.text import Text


def render_header(title: str, width: int = 40) -> Text:
    """
    Render an enhanced section header with box-drawing characters.

    Creates a visually prominent header like:
        ┌─ TITLE ────────────────────────────┐

    Args:
        title: Header title text
        width: Total width of the header line (default 40)

    Returns:
        Rich Text object with styled header
    """
    text = Text()

    # Calculate padding
    # Format: ┌─ TITLE ─────────────────────────┐
    title_with_spaces = f" {title} "
    remaining_width = width - 2 - len(title_with_spaces)  # -2 for ┌ and ┐
    if remaining_width < 4:
        remaining_width = 4

    # Build the header
    text.append("┌─", style="dim cyan")
    text.append(title_with_spaces, style="bold cyan")
    text.append("─" * remaining_width, style="dim cyan")
    text.append("┐\n", style="dim cyan")

    return text


def render_subheader(title: str, width: int = 40) -> Text:
    """
    Render a subheader with simpler styling.

    Creates a subheader like:
        ── Subtitle ──────────────────────────

    Args:
        title: Subheader title text
        width: Total width (default 40)

    Returns:
        Rich Text object with styled subheader
    """
    text = Text()

    title_with_spaces = f" {title} "
    left_padding = 2
    right_padding = width - left_padding - len(title_with_spaces)
    if right_padding < 2:
        right_padding = 2

    text.append("─" * left_padding, style="dim")
    text.append(title_with_spaces, style="bold yellow")
    text.append("─" * right_padding, style="dim")
    text.append("\n", style="dim")

    return text


def render_separator(width: int = 40, style: str = "dim") -> Text:
    """
    Render a simple separator line.

    Args:
        width: Width of separator (default 40)
        style: Rich style for the separator (default "dim")

    Returns:
        Rich Text object with separator
    """
    text = Text()
    text.append("─" * width + "\n", style=style)
    return text


def render_footer_link(label: str, hint: str = "") -> Text:
    """
    Render a clickable-style footer link.

    Creates a link like:
        [View All History] →

    Args:
        label: Link label text
        hint: Optional hint text after the link

    Returns:
        Rich Text object with styled link
    """
    text = Text()
    text.append("[", style="dim")
    text.append(label, style="italic cyan underline")
    text.append("]", style="dim")
    if hint:
        text.append(f" {hint}", style="dim")
    text.append("\n")
    return text

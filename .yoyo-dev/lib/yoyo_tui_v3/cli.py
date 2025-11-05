"""
CLI entry point for Yoyo Dev TUI with split view support.

This module handles command-line argument parsing and decides whether to
launch split view mode or TUI-only mode.
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

from lib.yoyo_tui_v3.split_view import SplitViewConfig, SplitViewManager
from lib.yoyo_tui_v3.app import YoyoDevTUIApp
from lib.yoyo_tui_v3 import __version__


def parse_args(argv: Optional[list] = None) -> argparse.Namespace:
    """
    Parse command-line arguments.

    Args:
        argv: Command-line arguments (defaults to sys.argv[1:])

    Returns:
        Parsed arguments namespace
    """
    parser = argparse.ArgumentParser(
        prog='yoyo',
        description='Yoyo Dev TUI - AI-Assisted Development Dashboard',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  yoyo                           # Launch with split view (default)
  yoyo --no-split                # Launch TUI only
  yoyo --split-ratio 0.5         # 50/50 split
  yoyo --focus tui               # Start with TUI focused
  yoyo --split-ratio 0.6 --focus tui  # Combined options

For more information, visit: https://github.com/yoyo-dev
        """
    )

    parser.add_argument(
        '--version', '-v',
        action='version',
        version=f'Yoyo Dev TUI v{__version__}'
    )

    parser.add_argument(
        '--no-split',
        action='store_false',
        dest='split_view',
        default=True,
        help='Launch TUI only (disable split view with Claude Code)'
    )

    parser.add_argument(
        '--split-ratio',
        type=float,
        default=0.4,
        metavar='RATIO',
        help='Split ratio for panes (0.0-1.0, default: 0.4 = 40%% left)'
    )

    parser.add_argument(
        '--focus',
        type=str,
        default='claude',
        choices=['claude', 'tui'],
        help='Which pane to focus on startup (default: claude)'
    )

    args = parser.parse_args(argv)

    # Validate split ratio range
    if not (0.0 <= args.split_ratio <= 1.0):
        parser.error(f"Split ratio must be between 0.0 and 1.0, got: {args.split_ratio}")

    return args


def load_config() -> SplitViewConfig:
    """
    Load split view configuration from config file.

    Returns:
        SplitViewConfig with settings from file or defaults
    """
    config_path = Path('.yoyo-dev/config.yml')

    if not config_path.exists():
        # Return defaults
        return SplitViewConfig()

    try:
        import yaml

        with open(config_path, 'r') as f:
            data = yaml.safe_load(f)

        split_view_data = data.get('split_view', {})

        return SplitViewConfig(
            enabled=split_view_data.get('enabled', True),
            ratio=split_view_data.get('ratio', 0.4),
            active_pane=split_view_data.get('active_pane', 'claude')
        )

    except Exception:
        # If config is corrupted or unreadable, use defaults
        return SplitViewConfig()


def merge_config_with_args(config: SplitViewConfig, args: argparse.Namespace) -> SplitViewConfig:
    """
    Merge configuration from file with CLI arguments.

    CLI arguments take precedence over config file settings.

    Args:
        config: Configuration loaded from file
        args: Parsed command-line arguments

    Returns:
        Merged configuration
    """
    return SplitViewConfig(
        enabled=args.split_view,
        ratio=args.split_ratio,
        active_pane=args.focus,
        border_style=config.border_style,
        shortcuts=config.shortcuts,
        claude=config.claude
    )


def should_use_split_view(args: argparse.Namespace) -> bool:
    """
    Determine if split view should be used.

    Args:
        args: Parsed command-line arguments

    Returns:
        True if split view should be launched, False otherwise
    """
    return args.split_view


def launch_split_view(config: SplitViewConfig) -> int:
    """
    Launch split view mode with Claude Code + TUI.

    Args:
        config: Split view configuration

    Returns:
        Exit code from split view manager
    """
    manager = SplitViewManager(config)
    return manager.launch()


def launch_tui_only() -> int:
    """
    Launch TUI-only mode (no split view).

    Returns:
        Exit code from TUI app
    """
    app = YoyoDevTUIApp()
    app.run()
    return 0


def main() -> int:
    """
    Main entry point for CLI.

    Returns:
        Exit code (0 for success, non-zero for error)
    """
    try:
        # Parse arguments
        args = parse_args()

        # Load config from file
        config = load_config()

        # Merge with CLI args
        config = merge_config_with_args(config, args)

        # Determine mode
        if should_use_split_view(args):
            # Launch split view
            try:
                return launch_split_view(config)
            except Exception as e:
                # If split view fails, fall back to TUI only
                print(f"Warning: Split view failed ({e}), falling back to TUI only...",
                      file=sys.stderr)
                return launch_tui_only()
        else:
            # Launch TUI only
            return launch_tui_only()

    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        return 130
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())

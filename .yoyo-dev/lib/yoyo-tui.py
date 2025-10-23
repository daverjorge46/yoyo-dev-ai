#!/usr/bin/env python3
"""
Yoyo Dev Textual TUI - Main Entry Point

Modern, interactive terminal user interface for AI-assisted development.

Usage:
  yoyo-tui.py                  # Launch TUI with default settings
  yoyo-tui.py --reset-config   # Reset configuration to defaults
  yoyo-tui.py --help           # Show help message

Environment Variables:
  YOYO_TUI_CONFIG - Custom config file path

Examples:
  yoyo-tui.py                           # Normal launch
  yoyo-tui.py --reset-config            # Reset to defaults
  YOYO_TUI_CONFIG=custom.yml yoyo-tui.py  # Custom config
"""

import argparse
import sys
from pathlib import Path


# ============================================================================
# Dependency Checking
# ============================================================================

def check_dependencies():
    """
    Check if required dependencies are available.

    Returns:
        True if all dependencies are available, False otherwise
    """
    missing = []

    # Check for textual
    try:
        import textual
    except ImportError:
        missing.append("textual")

    # Check for watchdog
    try:
        import watchdog
    except ImportError:
        missing.append("watchdog")

    # Check for yaml
    try:
        import yaml
    except ImportError:
        missing.append("pyyaml")

    if missing:
        print("Error: Missing required dependencies:", ", ".join(missing))
        print()
        print("Install with:")
        print(f"  ~/.yoyo-dev/setup/install-tui-deps.sh")
        print()
        print("Or manually:")
        print(f"  pip3 install {' '.join(missing)}")
        print()
        print("Falling back to alternative dashboard...")
        return False

    return True


# ============================================================================
# CLI Argument Parsing
# ============================================================================

def parse_args():
    """
    Parse command-line arguments.

    Returns:
        Namespace with parsed arguments
    """
    parser = argparse.ArgumentParser(
        description="Yoyo Dev Textual TUI - Interactive AI-Assisted Development",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    Launch TUI with default settings
  %(prog)s --reset-config     Reset configuration to defaults

For more information, visit: https://github.com/anthropics/yoyo-dev
        """
    )

    parser.add_argument(
        "--reset-config",
        action="store_true",
        help="Reset configuration to defaults and exit"
    )

    parser.add_argument(
        "--version",
        action="version",
        version="Yoyo Dev TUI v1.0.0"
    )

    return parser.parse_args()


# ============================================================================
# Configuration Management
# ============================================================================

def reset_configuration():
    """Reset configuration to defaults."""
    try:
        # Add lib to path for imports
        sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

        from yoyo_tui.config import ConfigManager

        print("Resetting configuration to defaults...")
        config = ConfigManager.create_default_config()
        config_path = ConfigManager.get_config_path()

        print(f"✓ Configuration reset: {config_path}")
        print()
        print("Default settings:")
        print(f"  Theme: {config.theme}")
        print(f"  Editor: {config.editor_command}")
        print(f"  Auto-refresh: {config.auto_refresh}")
        print()
        return True

    except Exception as e:
        print(f"Error resetting configuration: {e}")
        return False


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    """Main entry point for Yoyo Dev TUI."""
    # Parse arguments
    args = parse_args()

    # Handle --reset-config
    if args.reset_config:
        success = reset_configuration()
        sys.exit(0 if success else 1)

    # Check dependencies
    if not check_dependencies():
        # Exit with code 1 to trigger fallback chain
        sys.exit(1)

    try:
        # Add lib to path for imports
        sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))

        # Import and run app
        from yoyo_tui.app import YoyoDevApp

        app = YoyoDevApp()
        app.run()

    except KeyboardInterrupt:
        # Graceful shutdown on Ctrl+C
        print("\nShutting down gracefully...")
        sys.exit(0)

    except Exception as e:
        # Catch any errors and trigger fallback
        print(f"Error launching TUI: {e}")
        print()
        print("Falling back to alternative dashboard...")
        sys.exit(1)


if __name__ == "__main__":
    main()

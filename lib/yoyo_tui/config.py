"""
Configuration Management for Yoyo Dev Textual TUI

Handles loading and saving user preferences from YAML configuration file.
"""

import yaml
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional


@dataclass
class TUIConfig:
    """
    TUI configuration with user preferences.

    All settings have sensible defaults and can be customized via
    ~/.yoyo-dev/config/tui-config.yml
    """

    # General settings
    auto_refresh: bool = True
    refresh_interval: int = 5  # seconds (when file watching disabled)

    # Editor integration
    editor_command: str = "code"  # or "vim", "nano", "subl", etc.
    editor_args: str = "{file}"  # {file} placeholder for file path

    # Color scheme
    theme: str = "yoyo-dev"  # or "dark", "light", "dracula", "nord"

    # Layout
    sidebar_width: int = 30
    show_git_panel: bool = True
    compact_mode: bool = False

    # Keyboard shortcuts (customizable)
    keybindings: Dict[str, List[str]] = None

    # Features
    file_watching: bool = True
    git_integration: bool = True
    command_history: bool = True
    analytics: bool = False  # usage tracking (opt-in)

    def __post_init__(self):
        """Initialize default keybindings if not provided."""
        if self.keybindings is None:
            self.keybindings = {
                "command_palette": ["ctrl+p", "/"],
                "quit": ["q", "ctrl+c"],
                "help": ["?"],
                "refresh": ["r"],
                "git_menu": ["g"],
            }

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary for YAML serialization."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TUIConfig':
        """Create config from dictionary (loaded from YAML)."""
        # Flatten nested structures from YAML template
        flattened = {}

        for key, value in data.items():
            if key == 'editor' and isinstance(value, dict):
                # Flatten editor.command → editor_command
                flattened['editor_command'] = value.get('command', 'code')
                flattened['editor_args'] = value.get('args', '{file}')
            elif key == 'layout' and isinstance(value, dict):
                # Flatten layout.* → *
                flattened['sidebar_width'] = value.get('sidebar_width', 30)
                flattened['show_git_panel'] = value.get('show_git_panel', True)
                flattened['compact_mode'] = value.get('compact_mode', False)
            elif key == 'features' and isinstance(value, dict):
                # Flatten features.* → *
                flattened['file_watching'] = value.get('file_watching', True)
                flattened['git_integration'] = value.get('git_integration', True)
                flattened['command_history'] = value.get('command_history', True)
                flattened['analytics'] = value.get('analytics', False)
            elif key in ('advanced', 'experimental'):
                # Ignore advanced/experimental sections (not implemented yet)
                pass
            else:
                # Keep other keys as-is
                flattened[key] = value

        return cls(**flattened)


class ConfigManager:
    """
    Manage TUI configuration loading and saving.

    Configuration file location: ~/.yoyo-dev/config/tui-config.yml
    """

    DEFAULT_CONFIG_PATH = Path.home() / '.yoyo-dev' / 'config' / 'tui-config.yml'

    @classmethod
    def load(cls, config_path: Optional[Path] = None) -> TUIConfig:
        """
        Load configuration from YAML file.

        Args:
            config_path: Optional custom config path (defaults to DEFAULT_CONFIG_PATH)

        Returns:
            TUIConfig instance with loaded settings or defaults
        """
        path = config_path or cls.DEFAULT_CONFIG_PATH

        if path.exists():
            try:
                with open(path, 'r') as f:
                    data = yaml.safe_load(f)

                # Handle None or empty file
                if data is None:
                    return TUIConfig()

                return TUIConfig.from_dict(data)
            except (yaml.YAMLError, TypeError, ValueError) as e:
                # Config file is malformed, return defaults
                print(f"Warning: Could not load config from {path}: {e}")
                print("Using default configuration.")
                return TUIConfig()

        # Config doesn't exist, return defaults
        return TUIConfig()

    @classmethod
    def save(cls, config: TUIConfig, config_path: Optional[Path] = None) -> bool:
        """
        Save configuration to YAML file.

        Args:
            config: TUIConfig instance to save
            config_path: Optional custom config path (defaults to DEFAULT_CONFIG_PATH)

        Returns:
            True if save successful, False otherwise
        """
        path = config_path or cls.DEFAULT_CONFIG_PATH

        try:
            # Ensure directory exists
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(path, 'w') as f:
                yaml.dump(
                    config.to_dict(),
                    f,
                    default_flow_style=False,
                    sort_keys=False
                )
            return True
        except (IOError, yaml.YAMLError) as e:
            print(f"Error: Could not save config to {path}: {e}")
            return False

    @classmethod
    def create_default_config(cls, config_path: Optional[Path] = None) -> TUIConfig:
        """
        Create and save default configuration file with comments.

        Args:
            config_path: Optional custom config path (defaults to DEFAULT_CONFIG_PATH)

        Returns:
            TUIConfig instance with default values
        """
        path = config_path or cls.DEFAULT_CONFIG_PATH

        # Ensure directory exists
        path.parent.mkdir(parents=True, exist_ok=True)

        # Write config with comments
        config_content = """# Yoyo Dev Textual TUI Configuration
# This file controls TUI behavior and appearance

# General settings
auto_refresh: true
refresh_interval: 5  # seconds (when file watching disabled)

# Editor integration
editor:
  command: "code"  # or "vim", "nano", "subl", etc.
  args: "{file}"   # {file} placeholder for file path

# Color scheme
theme: "yoyo-dev"  # or "dark", "light", "dracula", "nord"

# Layout
layout:
  sidebar_width: 30
  show_git_panel: true
  compact_mode: false

# Keyboard shortcuts (customizable)
keybindings:
  command_palette: ["ctrl+p", "/"]
  quit: ["q", "ctrl+c"]
  help: ["?"]
  refresh: ["r"]
  git_menu: ["g"]

# Features
features:
  file_watching: true
  git_integration: true
  command_history: true
  analytics: false  # usage tracking (opt-in)
"""

        with open(path, 'w') as f:
            f.write(config_content)

        # Return loaded config
        return cls.load(path)

    @classmethod
    def get_config_path(cls) -> Path:
        """Get the default configuration file path."""
        return cls.DEFAULT_CONFIG_PATH

    @classmethod
    def config_exists(cls, config_path: Optional[Path] = None) -> bool:
        """Check if configuration file exists."""
        path = config_path or cls.DEFAULT_CONFIG_PATH
        return path.exists()


def get_default_config() -> TUIConfig:
    """
    Convenience function to get default configuration.

    Returns:
        TUIConfig with default values
    """
    return TUIConfig()


def load_config() -> TUIConfig:
    """
    Convenience function to load configuration from default location.

    Returns:
        Loaded TUIConfig or defaults if file doesn't exist
    """
    return ConfigManager.load()


def save_config(config: TUIConfig) -> bool:
    """
    Convenience function to save configuration to default location.

    Args:
        config: TUIConfig instance to save

    Returns:
        True if successful, False otherwise
    """
    return ConfigManager.save(config)

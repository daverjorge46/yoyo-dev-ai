"""
Layout Persistence Service.

Handles saving and loading split view layout configuration to/from
.yoyo-dev/config.yml. Provides schema validation, migration from old
formats, and graceful error handling.
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from ..split_view.manager import (
    SplitViewConfig,
    BorderStyle,
    KeyboardShortcuts,
    ClaudeConfig,
)


logger = logging.getLogger(__name__)


class LayoutPersistenceError(Exception):
    """Base exception for layout persistence errors."""
    pass


class ConfigValidationError(LayoutPersistenceError):
    """Raised when config validation fails."""
    pass


class LayoutPersistence:
    """
    Manages split view layout persistence.

    Handles:
    - Loading config from .yoyo-dev/config.yml
    - Saving config to .yoyo-dev/config.yml
    - Schema validation
    - Migration from old config formats
    - Graceful error handling
    """

    # Default configuration values
    DEFAULT_CONFIG = {
        'enabled': True,
        'ratio': 0.4,
        'active_pane': 'claude',
        'border_style': {
            'active': 'bright_cyan',
            'inactive': 'dim_white'
        },
        'shortcuts': {
            'switch_focus': 'ctrl+b+arrow',
            'resize_left': 'ctrl+b+<',
            'resize_right': 'ctrl+b+>'
        },
        'claude': {
            'command': 'claude',
            'auto_cwd': True,
            'fallback_delay': 3
        }
    }

    def __init__(self, config_path: Path):
        """
        Initialize layout persistence.

        Args:
            config_path: Path to config.yml file
        """
        self.config_path = Path(config_path)
        self._cached_data: Optional[Dict[str, Any]] = None

    def load_config(self) -> SplitViewConfig:
        """
        Load split view configuration from config.yml.

        Returns:
            SplitViewConfig with loaded or default values

        If the config file doesn't exist, is corrupted, or has invalid
        structure, returns a default configuration and logs a warning.
        """
        try:
            # Check if config file exists
            if not self.config_path.exists():
                logger.info(f"Config file not found: {self.config_path}. Using defaults.")
                return self._create_default_config()

            # Load YAML
            with open(self.config_path, 'r') as f:
                data = yaml.safe_load(f)

            # Handle empty file
            if data is None:
                logger.warning(f"Config file is empty: {self.config_path}. Using defaults.")
                return self._create_default_config()

            # Check if split_view section exists
            if 'split_view' not in data:
                logger.info("split_view section not found in config. Using defaults.")
                return self._create_default_config()

            split_view_data = data['split_view']

            # Validate structure (basic type check)
            if not isinstance(split_view_data, dict):
                logger.warning("split_view section has invalid structure. Using defaults.")
                return self._create_default_config()

            # Build config with defaults for missing fields
            config_dict = self._merge_with_defaults(split_view_data)

            # Create SplitViewConfig
            return self._dict_to_config(config_dict)

        except yaml.YAMLError as e:
            logger.error(f"Failed to parse config YAML: {e}. Using defaults.")
            return self._create_default_config()
        except Exception as e:
            logger.error(f"Unexpected error loading config: {e}. Using defaults.")
            return self._create_default_config()

    def save_config(self, config: SplitViewConfig) -> None:
        """
        Save split view configuration to config.yml.

        Args:
            config: Configuration to save

        Raises:
            LayoutPersistenceError: If save fails due to permissions or I/O error

        Preserves existing config sections and only updates split_view.
        Creates parent directories if they don't exist.
        """
        try:
            # Create parent directories if needed
            self.config_path.parent.mkdir(parents=True, exist_ok=True)

            # Load existing config or create empty dict
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    data = yaml.safe_load(f) or {}
            else:
                data = {}

            # Convert config to dict
            config_dict = self._config_to_dict(config)

            # Update split_view section
            data['split_view'] = config_dict

            # Write back to file
            with open(self.config_path, 'w') as f:
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)

            logger.info(f"Saved split view config to {self.config_path}")

        except PermissionError:
            raise LayoutPersistenceError(f"Permission denied writing to {self.config_path}")
        except IOError as e:
            raise LayoutPersistenceError(f"I/O error saving config: {e}")
        except Exception as e:
            raise LayoutPersistenceError(f"Unexpected error saving config: {e}")

    def validate_config(self) -> None:
        """
        Validate config schema.

        Raises:
            ConfigValidationError: If validation fails

        Checks:
        - split_view section exists
        - Required fields present
        - Field types correct
        - Values within valid ranges
        """
        # Load YAML
        if not self.config_path.exists():
            raise ConfigValidationError(f"Config file not found: {self.config_path}")

        with open(self.config_path, 'r') as f:
            data = yaml.safe_load(f)

        if data is None or not isinstance(data, dict):
            raise ConfigValidationError("Config file is empty or invalid")

        # Check split_view section exists
        if 'split_view' not in data:
            raise ConfigValidationError("split_view section not found in config")

        split_view = data['split_view']

        if not isinstance(split_view, dict):
            raise ConfigValidationError("split_view must be a dictionary")

        # Validate required fields
        required_fields = ['enabled', 'ratio', 'active_pane']
        for field in required_fields:
            if field not in split_view:
                raise ConfigValidationError(f"required field '{field}' missing from split_view")

        # Validate enabled (boolean)
        if not isinstance(split_view['enabled'], bool):
            raise ConfigValidationError("enabled must be a boolean")

        # Validate ratio (0.0 - 1.0)
        ratio = split_view['ratio']
        if not isinstance(ratio, (int, float)):
            raise ConfigValidationError("ratio must be a number")
        if not (0.0 <= ratio <= 1.0):
            raise ConfigValidationError("ratio must be between 0.0 and 1.0")

        # Validate active_pane
        if split_view['active_pane'] not in ['claude', 'tui']:
            raise ConfigValidationError("active_pane must be 'claude' or 'tui'")

        logger.info("Config validation passed")

    def migrate_config(self) -> None:
        """
        Migrate config from old format to new format.

        - Adds split_view section if missing
        - Fills in missing fields with defaults
        - Preserves existing valid values
        """
        try:
            # Load existing config
            if not self.config_path.exists():
                logger.info("No config file to migrate")
                return

            with open(self.config_path, 'r') as f:
                data = yaml.safe_load(f) or {}

            # Check if split_view exists
            if 'split_view' not in data:
                # Add complete split_view section
                data['split_view'] = self.DEFAULT_CONFIG.copy()
                logger.info("Added missing split_view section")
            else:
                # Merge with defaults for missing fields
                data['split_view'] = self._merge_with_defaults(data['split_view'])
                logger.info("Filled in missing split_view fields")

            # Write back
            with open(self.config_path, 'w') as f:
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)

            logger.info(f"Config migration complete: {self.config_path}")

        except Exception as e:
            logger.error(f"Config migration failed: {e}")
            raise LayoutPersistenceError(f"Migration failed: {e}")

    def _create_default_config(self) -> SplitViewConfig:
        """Create a SplitViewConfig with default values."""
        return SplitViewConfig(
            enabled=self.DEFAULT_CONFIG['enabled'],
            ratio=self.DEFAULT_CONFIG['ratio'],
            active_pane=self.DEFAULT_CONFIG['active_pane'],
            border_style=BorderStyle(
                active=self.DEFAULT_CONFIG['border_style']['active'],
                inactive=self.DEFAULT_CONFIG['border_style']['inactive']
            ),
            shortcuts=KeyboardShortcuts(),
            claude=ClaudeConfig(
                command=self.DEFAULT_CONFIG['claude']['command'],
                auto_cwd=self.DEFAULT_CONFIG['claude']['auto_cwd'],
                fallback_delay=self.DEFAULT_CONFIG['claude']['fallback_delay']
            )
        )

    def _merge_with_defaults(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge config data with defaults for missing fields.

        Args:
            config_data: Partial config dictionary

        Returns:
            Complete config dictionary with defaults applied
        """
        result = self.DEFAULT_CONFIG.copy()

        # Update with provided values
        for key, value in config_data.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Merge nested dicts
                result[key] = {**result[key], **value}
            else:
                result[key] = value

        return result

    def _dict_to_config(self, config_dict: Dict[str, Any]) -> SplitViewConfig:
        """
        Convert dictionary to SplitViewConfig object.

        Args:
            config_dict: Configuration dictionary

        Returns:
            SplitViewConfig instance
        """
        border_style_data = config_dict.get('border_style', {})
        claude_data = config_dict.get('claude', {})

        return SplitViewConfig(
            enabled=config_dict.get('enabled', True),
            ratio=config_dict.get('ratio', 0.4),
            active_pane=config_dict.get('active_pane', 'claude'),
            border_style=BorderStyle(
                active=border_style_data.get('active', 'bright_cyan'),
                inactive=border_style_data.get('inactive', 'dim_white')
            ),
            shortcuts=KeyboardShortcuts(),  # Use defaults for shortcuts
            claude=ClaudeConfig(
                command=claude_data.get('command', 'claude'),
                auto_cwd=claude_data.get('auto_cwd', True),
                fallback_delay=claude_data.get('fallback_delay', 3)
            )
        )

    def _config_to_dict(self, config: SplitViewConfig) -> Dict[str, Any]:
        """
        Convert SplitViewConfig to dictionary for YAML serialization.

        Args:
            config: SplitViewConfig instance

        Returns:
            Dictionary representation
        """
        return {
            'enabled': config.enabled,
            'ratio': config.ratio,
            'active_pane': config.active_pane,
            'border_style': {
                'active': config.border_style.active,
                'inactive': config.border_style.inactive
            },
            'shortcuts': {
                'switch_focus': 'ctrl+b+arrow',
                'resize_left': 'ctrl+b+<',
                'resize_right': 'ctrl+b+>'
            },
            'claude': {
                'command': config.claude.command,
                'auto_cwd': config.claude.auto_cwd,
                'fallback_delay': config.claude.fallback_delay
            }
        }


# Export public API
__all__ = [
    'LayoutPersistence',
    'LayoutPersistenceError',
    'ConfigValidationError',
]

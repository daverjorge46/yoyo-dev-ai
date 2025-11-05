"""
Tests for Layout Persistence Service.

Tests config schema validation, save/load functionality, and migration
from old config formats.
"""

import pytest
import tempfile
import yaml
from pathlib import Path
from unittest.mock import patch, MagicMock

from lib.yoyo_tui_v3.services.layout_persistence import (
    LayoutPersistence,
    LayoutPersistenceError,
    ConfigValidationError,
)
from lib.yoyo_tui_v3.split_view.manager import (
    SplitViewConfig,
    BorderStyle,
    KeyboardShortcuts,
    ClaudeConfig,
)


class TestConfigSchemaValidation:
    """Test configuration schema validation."""

    def test_validate_valid_config(self, tmp_path):
        """Should validate a complete, valid config."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
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
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        # Should not raise
        persistence.validate_config()

    def test_validate_missing_split_view_section(self, tmp_path):
        """Should fail if split_view section is missing."""
        config_file = tmp_path / "config.yml"
        config_data = {'other_key': 'value'}
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        with pytest.raises(ConfigValidationError, match="split_view section not found"):
            persistence.validate_config()

    def test_validate_invalid_ratio(self, tmp_path):
        """Should fail if ratio is not between 0.0 and 1.0."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
                'enabled': True,
                'ratio': 1.5,  # Invalid: > 1.0
                'active_pane': 'claude'
            }
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        with pytest.raises(ConfigValidationError, match="ratio must be between 0.0 and 1.0"):
            persistence.validate_config()

    def test_validate_invalid_active_pane(self, tmp_path):
        """Should fail if active_pane is not 'claude' or 'tui'."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
                'enabled': True,
                'ratio': 0.4,
                'active_pane': 'invalid'  # Invalid value
            }
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        with pytest.raises(ConfigValidationError, match="active_pane must be 'claude' or 'tui'"):
            persistence.validate_config()

    def test_validate_invalid_enabled_type(self, tmp_path):
        """Should fail if enabled is not a boolean."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
                'enabled': 'yes',  # Should be boolean
                'ratio': 0.4,
                'active_pane': 'claude'
            }
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        with pytest.raises(ConfigValidationError, match="enabled must be a boolean"):
            persistence.validate_config()

    def test_validate_missing_required_fields(self, tmp_path):
        """Should fail if required fields are missing."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
                'enabled': True
                # Missing ratio and active_pane
            }
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        with pytest.raises(ConfigValidationError, match="required field.*missing"):
            persistence.validate_config()


class TestLoadConfig:
    """Test loading configuration from config.yml."""

    def test_load_complete_config(self, tmp_path):
        """Should load a complete config into SplitViewConfig."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
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
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        config = persistence.load_config()

        assert isinstance(config, SplitViewConfig)
        assert config.enabled is True
        assert config.ratio == 0.4
        assert config.active_pane == 'claude'
        assert config.border_style.active == 'bright_cyan'
        assert config.border_style.inactive == 'dim_white'
        assert config.claude.command == 'claude'
        assert config.claude.auto_cwd is True
        assert config.claude.fallback_delay == 3

    def test_load_minimal_config_with_defaults(self, tmp_path):
        """Should load minimal config and apply defaults for missing fields."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
                'enabled': True,
                'ratio': 0.5,
                'active_pane': 'tui'
            }
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        config = persistence.load_config()

        assert config.enabled is True
        assert config.ratio == 0.5
        assert config.active_pane == 'tui'
        # Check defaults
        assert config.border_style.active == 'bright_cyan'
        assert config.border_style.inactive == 'dim_white'
        assert config.claude.command == 'claude'
        assert config.claude.auto_cwd is True
        assert config.claude.fallback_delay == 3

    def test_load_missing_config_file(self, tmp_path):
        """Should return default config if file doesn't exist."""
        config_file = tmp_path / "nonexistent.yml"

        persistence = LayoutPersistence(config_file)
        config = persistence.load_config()

        # Should return defaults
        assert isinstance(config, SplitViewConfig)
        assert config.enabled is True
        assert config.ratio == 0.4
        assert config.active_pane == 'claude'

    def test_load_corrupted_config_file(self, tmp_path):
        """Should return defaults and log warning if config is corrupted."""
        config_file = tmp_path / "config.yml"
        config_file.write_text("invalid: yaml: content: [[[")

        persistence = LayoutPersistence(config_file)
        config = persistence.load_config()

        # Should return defaults after corruption
        assert isinstance(config, SplitViewConfig)
        assert config.enabled is True

    def test_load_empty_config_file(self, tmp_path):
        """Should return defaults if config file is empty."""
        config_file = tmp_path / "config.yml"
        config_file.write_text("")

        persistence = LayoutPersistence(config_file)
        config = persistence.load_config()

        # Should return defaults
        assert isinstance(config, SplitViewConfig)
        assert config.enabled is True


class TestSaveConfig:
    """Test saving configuration to config.yml."""

    def test_save_config_to_new_file(self, tmp_path):
        """Should save SplitViewConfig to a new file."""
        config_file = tmp_path / "config.yml"

        config = SplitViewConfig(
            enabled=True,
            ratio=0.4,
            active_pane='claude',
            border_style=BorderStyle(active='bright_cyan', inactive='dim_white'),
            shortcuts=KeyboardShortcuts(),
            claude=ClaudeConfig(command='claude', auto_cwd=True, fallback_delay=3)
        )

        persistence = LayoutPersistence(config_file)
        persistence.save_config(config)

        # Verify file was created and contains correct data
        assert config_file.exists()
        with open(config_file, 'r') as f:
            saved_data = yaml.safe_load(f)

        assert 'split_view' in saved_data
        assert saved_data['split_view']['enabled'] is True
        assert saved_data['split_view']['ratio'] == 0.4
        assert saved_data['split_view']['active_pane'] == 'claude'

    def test_save_config_to_existing_file(self, tmp_path):
        """Should update split_view section in existing config."""
        config_file = tmp_path / "config.yml"
        # Create existing config with other sections
        existing_data = {
            'yoyo_dev_version': '1.5.0',
            'agents': {'claude_code': {'enabled': True}},
            'split_view': {
                'enabled': False,
                'ratio': 0.5,
                'active_pane': 'tui'
            }
        }
        config_file.write_text(yaml.dump(existing_data))

        # Update split_view config
        config = SplitViewConfig(
            enabled=True,
            ratio=0.3,
            active_pane='claude'
        )

        persistence = LayoutPersistence(config_file)
        persistence.save_config(config)

        # Verify split_view was updated but other sections preserved
        with open(config_file, 'r') as f:
            saved_data = yaml.safe_load(f)

        assert saved_data['yoyo_dev_version'] == '1.5.0'
        assert saved_data['agents']['claude_code']['enabled'] is True
        assert saved_data['split_view']['enabled'] is True
        assert saved_data['split_view']['ratio'] == 0.3
        assert saved_data['split_view']['active_pane'] == 'claude'

    def test_save_config_preserves_formatting(self, tmp_path):
        """Should preserve YAML formatting and comments where possible."""
        config_file = tmp_path / "config.yml"
        existing_content = """# Yoyo Dev Configuration

yoyo_dev_version: 1.5.0

# Split view configuration
split_view:
  enabled: false
  ratio: 0.4
"""
        config_file.write_text(existing_content)

        config = SplitViewConfig(enabled=True, ratio=0.5, active_pane='tui')

        persistence = LayoutPersistence(config_file)
        persistence.save_config(config)

        # Read back and verify structure
        with open(config_file, 'r') as f:
            saved_data = yaml.safe_load(f)

        assert saved_data['split_view']['enabled'] is True
        assert saved_data['split_view']['ratio'] == 0.5


class TestConfigMigration:
    """Test migration from old config formats."""

    def test_migrate_from_missing_split_view(self, tmp_path):
        """Should add split_view section to old config without it."""
        config_file = tmp_path / "config.yml"
        old_config = {
            'yoyo_dev_version': '1.4.0',
            'agents': {'claude_code': {'enabled': True}}
        }
        config_file.write_text(yaml.dump(old_config))

        persistence = LayoutPersistence(config_file)
        persistence.migrate_config()

        # Verify split_view section was added
        with open(config_file, 'r') as f:
            migrated_data = yaml.safe_load(f)

        assert 'split_view' in migrated_data
        assert migrated_data['split_view']['enabled'] is True
        assert migrated_data['split_view']['ratio'] == 0.4
        assert migrated_data['split_view']['active_pane'] == 'claude'

    def test_migrate_partial_split_view(self, tmp_path):
        """Should fill in missing fields in partial split_view section."""
        config_file = tmp_path / "config.yml"
        old_config = {
            'yoyo_dev_version': '1.4.0',
            'split_view': {
                'enabled': True,
                'ratio': 0.6
                # Missing active_pane and other fields
            }
        }
        config_file.write_text(yaml.dump(old_config))

        persistence = LayoutPersistence(config_file)
        persistence.migrate_config()

        # Verify missing fields were added
        with open(config_file, 'r') as f:
            migrated_data = yaml.safe_load(f)

        assert migrated_data['split_view']['enabled'] is True
        assert migrated_data['split_view']['ratio'] == 0.6
        assert migrated_data['split_view']['active_pane'] == 'claude'
        assert 'border_style' in migrated_data['split_view']
        assert 'claude' in migrated_data['split_view']

    def test_migrate_preserves_existing_values(self, tmp_path):
        """Should not overwrite existing valid values during migration."""
        config_file = tmp_path / "config.yml"
        old_config = {
            'split_view': {
                'enabled': False,
                'ratio': 0.3,
                'active_pane': 'tui',
                'border_style': {
                    'active': 'yellow',
                    'inactive': 'gray'
                }
            }
        }
        config_file.write_text(yaml.dump(old_config))

        persistence = LayoutPersistence(config_file)
        persistence.migrate_config()

        # Verify existing values were preserved
        with open(config_file, 'r') as f:
            migrated_data = yaml.safe_load(f)

        assert migrated_data['split_view']['enabled'] is False
        assert migrated_data['split_view']['ratio'] == 0.3
        assert migrated_data['split_view']['active_pane'] == 'tui'
        assert migrated_data['split_view']['border_style']['active'] == 'yellow'
        assert migrated_data['split_view']['border_style']['inactive'] == 'gray'


class TestErrorHandling:
    """Test graceful error handling."""

    def test_handle_permission_denied(self, tmp_path):
        """Should raise appropriate error if file is not writable."""
        config_file = tmp_path / "config.yml"
        config_file.write_text("split_view:\n  enabled: true\n")
        config_file.chmod(0o444)  # Read-only

        config = SplitViewConfig(enabled=False, ratio=0.5, active_pane='tui')
        persistence = LayoutPersistence(config_file)

        with pytest.raises(LayoutPersistenceError, match="Permission denied"):
            persistence.save_config(config)

    def test_handle_directory_not_exists(self, tmp_path):
        """Should create parent directories if they don't exist."""
        config_file = tmp_path / "nested" / "dir" / "config.yml"

        config = SplitViewConfig(enabled=True, ratio=0.4, active_pane='claude')
        persistence = LayoutPersistence(config_file)
        persistence.save_config(config)

        # Verify file was created with parent directories
        assert config_file.exists()
        with open(config_file, 'r') as f:
            saved_data = yaml.safe_load(f)
        assert saved_data['split_view']['enabled'] is True

    def test_handle_invalid_yaml_structure(self, tmp_path):
        """Should handle configs with invalid structure gracefully."""
        config_file = tmp_path / "config.yml"
        # Write something that's valid YAML but wrong structure
        config_file.write_text("split_view: just_a_string")

        persistence = LayoutPersistence(config_file)

        # Should return defaults when structure is invalid
        config = persistence.load_config()
        assert isinstance(config, SplitViewConfig)
        assert config.enabled is True  # Default value


class TestDefaultValues:
    """Test that default values are correctly applied."""

    def test_default_config_values(self):
        """Should create config with correct default values."""
        config = SplitViewConfig()

        assert config.enabled is True
        assert config.ratio == 0.4
        assert config.active_pane == 'claude'
        assert config.border_style.active == 'bright_cyan'
        assert config.border_style.inactive == 'dim_white'
        assert config.claude.command == 'claude'
        assert config.claude.auto_cwd is True
        assert config.claude.fallback_delay == 3

    def test_load_applies_defaults_for_missing_fields(self, tmp_path):
        """Should apply defaults for any missing optional fields."""
        config_file = tmp_path / "config.yml"
        config_data = {
            'split_view': {
                'enabled': True,
                'ratio': 0.4,
                'active_pane': 'claude'
                # Missing all optional fields
            }
        }
        config_file.write_text(yaml.dump(config_data))

        persistence = LayoutPersistence(config_file)
        config = persistence.load_config()

        # Verify defaults were applied
        assert config.border_style.active == 'bright_cyan'
        assert config.border_style.inactive == 'dim_white'
        assert config.claude.command == 'claude'
        assert config.claude.auto_cwd is True

"""
Test TUI Configuration System

Tests for Task 8: Configuration options for refresh behavior.
"""

import tempfile
import pytest
import yaml
from pathlib import Path

from lib.yoyo_tui.config import (
    TUIConfig,
    ConfigManager,
    get_default_config,
    load_config,
    save_config,
)


class TestTUIConfig:
    """Test TUIConfig dataclass and defaults."""

    def test_default_config_values(self):
        """Test that default config has expected values."""
        config = TUIConfig()

        # General settings
        assert config.auto_refresh is True
        assert config.refresh_interval == 5

        # Performance settings (Task 8)
        assert config.git_cache_ttl == 30.0
        assert config.spec_cache_ttl == 30.0
        assert config.file_watcher_debounce == 1.5
        assert config.file_watcher_max_wait == 5.0
        assert config.performance_mode is False

        # Features
        assert config.file_watching is True
        assert config.git_integration is True

    def test_performance_mode_adjustments(self):
        """Test that performance_mode=True adjusts all settings (2x longer)."""
        config = TUIConfig(performance_mode=True)

        # Performance mode should double all intervals
        assert config.git_cache_ttl == 60.0  # 30 * 2
        assert config.spec_cache_ttl == 60.0  # 30 * 2
        assert config.refresh_interval == 10  # 5 * 2
        assert config.file_watcher_debounce == 3.0  # 1.5 * 2
        assert config.file_watcher_max_wait == 10.0  # 5 * 2

    def test_custom_git_cache_ttl(self):
        """Test custom git_cache_ttl value."""
        config = TUIConfig(git_cache_ttl=60.0)
        assert config.git_cache_ttl == 60.0

    def test_custom_spec_cache_ttl(self):
        """Test custom spec_cache_ttl value."""
        config = TUIConfig(spec_cache_ttl=45.0)
        assert config.spec_cache_ttl == 45.0

    def test_custom_file_watcher_debounce(self):
        """Test custom file_watcher_debounce value."""
        config = TUIConfig(file_watcher_debounce=2.0)
        assert config.file_watcher_debounce == 2.0

    def test_custom_file_watcher_max_wait(self):
        """Test custom file_watcher_max_wait value."""
        config = TUIConfig(file_watcher_max_wait=8.0)
        assert config.file_watcher_max_wait == 8.0

    def test_disable_file_watching(self):
        """Test disabling file watching via config."""
        config = TUIConfig(file_watching=False)
        assert config.file_watching is False

    def test_disable_auto_refresh(self):
        """Test disabling auto refresh via config."""
        config = TUIConfig(auto_refresh=False)
        assert config.auto_refresh is False

    def test_config_to_dict(self):
        """Test converting config to dictionary."""
        config = TUIConfig(git_cache_ttl=45.0, performance_mode=True)
        config_dict = config.to_dict()

        assert isinstance(config_dict, dict)
        assert config_dict['git_cache_ttl'] == 60.0  # Adjusted by performance_mode
        assert config_dict['performance_mode'] is True


class TestConfigFromDict:
    """Test loading config from YAML dictionary."""

    def test_load_from_flat_dict(self):
        """Test loading config from flat dictionary."""
        data = {
            'auto_refresh': True,
            'refresh_interval': 10,
            'git_cache_ttl': 45.0,
            'spec_cache_ttl': 45.0,
            'file_watcher_debounce': 2.5,
            'file_watcher_max_wait': 7.0,
            'performance_mode': False,
        }

        config = TUIConfig.from_dict(data)

        assert config.auto_refresh is True
        assert config.refresh_interval == 10
        assert config.git_cache_ttl == 45.0
        assert config.spec_cache_ttl == 45.0
        assert config.file_watcher_debounce == 2.5
        assert config.file_watcher_max_wait == 7.0
        assert config.performance_mode is False

    def test_load_from_nested_dict(self):
        """Test loading config from nested YAML structure."""
        data = {
            'auto_refresh': True,
            'refresh_interval': 8,
            'performance': {
                'git_cache_ttl': 60.0,
                'spec_cache_ttl': 60.0,
                'file_watcher_debounce': 3.0,
                'file_watcher_max_wait': 10.0,
                'performance_mode': True,
            },
            'features': {
                'file_watching': False,
                'git_integration': True,
            }
        }

        config = TUIConfig.from_dict(data)

        # Performance settings should be loaded from nested dict
        assert config.git_cache_ttl == 60.0
        assert config.spec_cache_ttl == 60.0
        assert config.file_watcher_debounce == 3.0
        assert config.file_watcher_max_wait == 10.0
        assert config.performance_mode is True

        # But performance_mode should NOT adjust them again (already set)
        # Note: This test verifies that explicit values are NOT overridden

        # Features should be loaded
        assert config.file_watching is False
        assert config.git_integration is True

    def test_load_with_missing_performance_section(self):
        """Test loading config with missing performance section uses defaults."""
        data = {
            'auto_refresh': True,
            'refresh_interval': 5,
        }

        config = TUIConfig.from_dict(data)

        # Should use default performance settings
        assert config.git_cache_ttl == 30.0
        assert config.spec_cache_ttl == 30.0
        assert config.file_watcher_debounce == 1.5
        assert config.file_watcher_max_wait == 5.0
        assert config.performance_mode is False


class TestConfigManager:
    """Test ConfigManager file operations."""

    def test_load_nonexistent_config(self):
        """Test loading config when file doesn't exist returns defaults."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'nonexistent.yml'
            config = ConfigManager.load(config_path)

            # Should return default config
            assert config.git_cache_ttl == 30.0
            assert config.spec_cache_ttl == 30.0
            assert config.performance_mode is False

    def test_save_and_load_config(self):
        """Test saving and loading config round-trip."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'test-config.yml'

            # Create custom config
            original_config = TUIConfig(
                git_cache_ttl=45.0,
                spec_cache_ttl=50.0,
                file_watcher_debounce=2.0,
                file_watcher_max_wait=8.0,
                performance_mode=False,
            )

            # Save config
            success = ConfigManager.save(original_config, config_path)
            assert success is True
            assert config_path.exists()

            # Load config back
            loaded_config = ConfigManager.load(config_path)

            # Verify values match
            assert loaded_config.git_cache_ttl == 45.0
            assert loaded_config.spec_cache_ttl == 50.0
            assert loaded_config.file_watcher_debounce == 2.0
            assert loaded_config.file_watcher_max_wait == 8.0
            assert loaded_config.performance_mode is False

    def test_save_config_creates_directory(self):
        """Test that save creates parent directories if needed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'subdir' / 'config.yml'

            config = TUIConfig(git_cache_ttl=60.0)
            success = ConfigManager.save(config, config_path)

            assert success is True
            assert config_path.exists()
            assert config_path.parent.exists()

    def test_load_malformed_config(self):
        """Test loading malformed YAML returns defaults."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'malformed.yml'

            # Write malformed YAML
            with open(config_path, 'w') as f:
                f.write("invalid: yaml: syntax: [[[")

            # Should return defaults and not crash
            config = ConfigManager.load(config_path)
            assert config.git_cache_ttl == 30.0

    def test_load_empty_config_file(self):
        """Test loading empty config file returns defaults."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'empty.yml'

            # Write empty file
            config_path.touch()

            # Should return defaults
            config = ConfigManager.load(config_path)
            assert config.git_cache_ttl == 30.0
            assert config.spec_cache_ttl == 30.0

    def test_create_default_config(self):
        """Test creating default config file with documentation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'default-config.yml'

            config = ConfigManager.create_default_config(config_path)

            # File should exist
            assert config_path.exists()

            # Config should have default values
            assert config.git_cache_ttl == 30.0
            assert config.spec_cache_ttl == 30.0
            assert config.performance_mode is False

            # File should contain comments
            content = config_path.read_text()
            assert '# Performance settings' in content
            assert 'git_cache_ttl' in content
            assert 'performance_mode' in content

    def test_config_exists(self):
        """Test checking if config file exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / 'test.yml'

            # Should not exist initially
            assert ConfigManager.config_exists(config_path) is False

            # Create file
            config_path.touch()

            # Should exist now
            assert ConfigManager.config_exists(config_path) is True


class TestPerformanceModeIntegration:
    """Test performance_mode integration with other settings."""

    def test_performance_mode_overrides_individual_settings(self):
        """Test that performance_mode=True overrides individual settings."""
        # Set custom values but enable performance_mode
        config = TUIConfig(
            git_cache_ttl=15.0,  # Will be overridden to 60.0
            spec_cache_ttl=20.0,  # Will be overridden to 60.0
            refresh_interval=3,  # Will be overridden to 10
            performance_mode=True
        )

        # Performance mode should override all values
        assert config.git_cache_ttl == 60.0
        assert config.spec_cache_ttl == 60.0
        assert config.refresh_interval == 10
        assert config.file_watcher_debounce == 3.0
        assert config.file_watcher_max_wait == 10.0

    def test_performance_mode_from_yaml(self):
        """Test loading performance_mode from YAML applies adjustments."""
        data = {
            'performance': {
                'performance_mode': True
            }
        }

        config = TUIConfig.from_dict(data)

        # Performance mode should have been applied during __post_init__
        assert config.performance_mode is True
        assert config.git_cache_ttl == 60.0
        assert config.spec_cache_ttl == 60.0
        assert config.refresh_interval == 10


class TestConvenienceFunctions:
    """Test convenience functions for config management."""

    def test_get_default_config(self):
        """Test get_default_config returns fresh config with defaults."""
        config = get_default_config()

        assert isinstance(config, TUIConfig)
        assert config.git_cache_ttl == 30.0
        assert config.performance_mode is False

    def test_load_config_convenience(self):
        """Test load_config convenience function."""
        # This will try to load from default location
        # Should return defaults if file doesn't exist
        config = load_config()

        assert isinstance(config, TUIConfig)
        # Should have reasonable defaults
        assert config.git_cache_ttl > 0
        assert config.spec_cache_ttl > 0

    def test_save_config_convenience(self):
        """Test save_config convenience function."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Temporarily override default path
            original_path = ConfigManager.DEFAULT_CONFIG_PATH
            ConfigManager.DEFAULT_CONFIG_PATH = Path(tmpdir) / 'test-config.yml'

            try:
                config = TUIConfig(git_cache_ttl=77.0)
                success = save_config(config)

                assert success is True
                assert ConfigManager.DEFAULT_CONFIG_PATH.exists()

                # Verify saved correctly
                loaded = load_config()
                assert loaded.git_cache_ttl == 77.0
            finally:
                # Restore original path
                ConfigManager.DEFAULT_CONFIG_PATH = original_path


class TestConfigValidation:
    """Test config validation and type conversion."""

    def test_float_type_conversion(self):
        """Test that float values are properly converted."""
        data = {
            'performance': {
                'git_cache_ttl': '45.0',  # String should be converted to float
                'spec_cache_ttl': 60,  # Int should be converted to float
            }
        }

        config = TUIConfig.from_dict(data)

        assert isinstance(config.git_cache_ttl, float)
        assert isinstance(config.spec_cache_ttl, float)
        assert config.git_cache_ttl == 45.0
        assert config.spec_cache_ttl == 60.0

    def test_bool_type_conversion(self):
        """Test that bool values are properly converted."""
        data = {
            'performance': {
                'performance_mode': 'true',  # String should be converted
            }
        }

        config = TUIConfig.from_dict(data)

        # Note: bool('true') is always True in Python
        assert isinstance(config.performance_mode, bool)

    def test_negative_values_allowed(self):
        """Test that negative values are allowed (edge case)."""
        # This is technically allowed but not recommended
        config = TUIConfig(git_cache_ttl=-1.0)
        assert config.git_cache_ttl == -1.0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

/**
 * Tests for Config Loader
 * @version 6.2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../config-loader';

// Mock fs module
vi.mock('fs');

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset environment
    delete process.env.YOYO_ORCHESTRATION;
    loader = new ConfigLoader(mockProjectRoot);
  });

  afterEach(() => {
    delete process.env.YOYO_ORCHESTRATION;
  });

  describe('load', () => {
    it('should return defaults when config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const config = loader.load();

      expect(config.enabled).toBe(true);
      expect(config.globalMode).toBe(true);
      expect(config.confidenceThreshold).toBe(0.6);
    });

    it('should parse config file when it exists', () => {
      const configContent = `
orchestration:
  enabled: true
  globalMode: true
  showPrefixes: false
  confidenceThreshold: 0.8
`;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(configContent);

      const config = loader.load();

      expect(config.showPrefixes).toBe(false);
      expect(config.confidenceThreshold).toBe(0.8);
    });

    it('should override with environment variable', () => {
      process.env.YOYO_ORCHESTRATION = 'false';
      loader = new ConfigLoader(mockProjectRoot);

      const config = loader.load();

      expect(config.enabled).toBe(false);
    });

    it('should cache loaded config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      loader.load();
      loader.load();

      expect(fs.existsSync).toHaveBeenCalledTimes(1);
    });

    it('should handle parse errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = loader.load();

      expect(config.enabled).toBe(true); // Falls back to defaults
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('reload', () => {
    it('should force reload from file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      loader.load();
      loader.reload();

      expect(fs.existsSync).toHaveBeenCalledTimes(2);
    });

    it('should pick up config changes', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(`
orchestration:
  confidenceThreshold: 0.5
`)
        .mockReturnValueOnce(`
orchestration:
  confidenceThreshold: 0.9
`);

      const first = loader.load();
      expect(first.confidenceThreshold).toBe(0.5);

      const second = loader.reload();
      expect(second.confidenceThreshold).toBe(0.9);
    });
  });

  describe('config merging', () => {
    it('should preserve defaults for missing values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  showPrefixes: false
`);

      const config = loader.load();

      // Overridden value
      expect(config.showPrefixes).toBe(false);

      // Default values preserved
      expect(config.enabled).toBe(true);
      expect(config.confidenceThreshold).toBe(0.6);
      expect(config.routing.frontendDelegation.enabled).toBe(true);
    });

    it('should handle nested routing config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  routing:
    frontendDelegation:
      enabled: false
`);

      const config = loader.load();

      expect(config.routing.frontendDelegation.enabled).toBe(false);
      // Other routing configs should use defaults
      expect(config.routing.researchDelegation.enabled).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      const configPath = loader.getConfigPath();

      expect(configPath).toBe(
        path.join(mockProjectRoot, '.yoyo-dev', 'config.yml')
      );
    });
  });

  describe('configFileExists', () => {
    it('should check if config file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(loader.configFileExists()).toBe(true);

      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(loader.configFileExists()).toBe(false);
    });
  });

  describe('getDefaults', () => {
    it('should return a copy of defaults', () => {
      const defaults = ConfigLoader.getDefaults();

      expect(defaults.enabled).toBe(true);
      expect(defaults.globalMode).toBe(true);
      expect(defaults.confidenceThreshold).toBe(0.6);

      // Should be a copy, not the original
      defaults.enabled = false;
      expect(ConfigLoader.getDefaults().enabled).toBe(true);
    });
  });

  describe('isOrchestrationEnabled', () => {
    it('should return true when both enabled and globalMode are true', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(loader.isOrchestrationEnabled()).toBe(true);
    });

    it('should return false when disabled via config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  enabled: false
`);

      expect(loader.isOrchestrationEnabled()).toBe(false);
    });

    it('should return false when globalMode is false', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  globalMode: false
`);

      expect(loader.isOrchestrationEnabled()).toBe(false);
    });

    it('should return false when disabled via environment', () => {
      process.env.YOYO_ORCHESTRATION = 'false';
      loader = new ConfigLoader(mockProjectRoot);

      expect(loader.isOrchestrationEnabled()).toBe(false);
    });
  });

  describe('YAML parsing', () => {
    it('should parse boolean values correctly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  enabled: true
  showPrefixes: false
`);

      const config = loader.load();

      expect(config.enabled).toBe(true);
      expect(config.showPrefixes).toBe(false);
    });

    it('should parse numeric values correctly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  confidenceThreshold: 0.75
  intentClassification:
    maxLatencyMs: 15
`);

      const config = loader.load();

      expect(config.confidenceThreshold).toBe(0.75);
      expect(config.intentClassification.maxLatencyMs).toBe(15);
    });

    it('should skip comments', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
# This is a comment
orchestration:
  # Another comment
  enabled: true
`);

      const config = loader.load();

      expect(config.enabled).toBe(true);
    });

    it('should handle string values', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
orchestration:
  routing:
    frontendDelegation:
      agent: dave-engineer
`);

      const config = loader.load();

      expect(config.routing.frontendDelegation.agent).toBe('dave-engineer');
    });
  });
});

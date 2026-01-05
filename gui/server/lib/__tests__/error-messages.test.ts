import { describe, it, expect } from 'vitest';
import {
  ExecutionErrorCode,
  EXECUTION_ERROR_CODES,
  getErrorMessage,
  getErrorDetails,
  isExecutionErrorCode,
  ExecutionError,
  createExecutionError,
} from '../error-messages.js';

describe('Error Messages', () => {
  describe('EXECUTION_ERROR_CODES', () => {
    it('should contain all expected error codes', () => {
      expect(EXECUTION_ERROR_CODES).toContain('RALPH_NOT_FOUND');
      expect(EXECUTION_ERROR_CODES).toContain('PROJECT_NOT_INITIALIZED');
      expect(EXECUTION_ERROR_CODES).toContain('PROMPT_GENERATION_FAILED');
      expect(EXECUTION_ERROR_CODES).toContain('SPAWN_FAILED');
      expect(EXECUTION_ERROR_CODES).toContain('PROCESS_CRASHED');
      expect(EXECUTION_ERROR_CODES).toContain('EXECUTION_NOT_RUNNING');
      expect(EXECUTION_ERROR_CODES).toContain('ALREADY_RUNNING');
    });

    it('should have exactly 7 error codes', () => {
      expect(EXECUTION_ERROR_CODES).toHaveLength(7);
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for RALPH_NOT_FOUND', () => {
      const message = getErrorMessage('RALPH_NOT_FOUND');
      expect(message).toContain('Ralph CLI not installed');
      expect(message).toContain('pip install');
    });

    it('should return user-friendly message for PROJECT_NOT_INITIALIZED', () => {
      const message = getErrorMessage('PROJECT_NOT_INITIALIZED');
      expect(message).toContain('not set up');
      expect(message).toContain('Ralph');
    });

    it('should return user-friendly message for PROMPT_GENERATION_FAILED', () => {
      const message = getErrorMessage('PROMPT_GENERATION_FAILED');
      expect(message).toContain('Failed to generate');
    });

    it('should return user-friendly message for SPAWN_FAILED', () => {
      const message = getErrorMessage('SPAWN_FAILED');
      expect(message).toContain('Failed to start');
    });

    it('should return user-friendly message for PROCESS_CRASHED', () => {
      const message = getErrorMessage('PROCESS_CRASHED');
      expect(message).toContain('exited unexpectedly');
    });

    it('should return user-friendly message for EXECUTION_NOT_RUNNING', () => {
      const message = getErrorMessage('EXECUTION_NOT_RUNNING');
      expect(message).toContain('No execution in progress');
    });

    it('should return user-friendly message for ALREADY_RUNNING', () => {
      const message = getErrorMessage('ALREADY_RUNNING');
      expect(message).toContain('already in progress');
    });

    it('should return generic message for unknown error code', () => {
      const message = getErrorMessage('UNKNOWN_CODE' as ExecutionErrorCode);
      expect(message).toContain('unexpected error');
    });
  });

  describe('getErrorDetails', () => {
    it('should return technical details for each error code', () => {
      const details = getErrorDetails('RALPH_NOT_FOUND');
      expect(details).toContain('which ralph');
    });

    it('should return empty string for unknown code', () => {
      const details = getErrorDetails('UNKNOWN' as ExecutionErrorCode);
      expect(details).toBe('');
    });
  });

  describe('isExecutionErrorCode', () => {
    it('should return true for valid error codes', () => {
      expect(isExecutionErrorCode('RALPH_NOT_FOUND')).toBe(true);
      expect(isExecutionErrorCode('SPAWN_FAILED')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isExecutionErrorCode('INVALID_CODE')).toBe(false);
      expect(isExecutionErrorCode('')).toBe(false);
      expect(isExecutionErrorCode('ralph_not_found')).toBe(false); // case-sensitive
    });

    it('should return false for non-strings', () => {
      expect(isExecutionErrorCode(null as any)).toBe(false);
      expect(isExecutionErrorCode(undefined as any)).toBe(false);
      expect(isExecutionErrorCode(123 as any)).toBe(false);
    });
  });

  describe('ExecutionError class', () => {
    it('should create error with code and message', () => {
      const error = new ExecutionError('RALPH_NOT_FOUND');

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('RALPH_NOT_FOUND');
      expect(error.message).toContain('Ralph CLI not installed');
      expect(error.name).toBe('ExecutionError');
    });

    it('should include custom details', () => {
      const error = new ExecutionError('SPAWN_FAILED', 'Custom detail info');

      expect(error.details).toBe('Custom detail info');
    });

    it('should be serializable to JSON', () => {
      const error = new ExecutionError('PROCESS_CRASHED', 'Exit code 1');
      const json = error.toJSON();

      expect(json.code).toBe('PROCESS_CRASHED');
      expect(json.message).toContain('exited unexpectedly');
      expect(json.details).toBe('Exit code 1');
    });
  });

  describe('createExecutionError', () => {
    it('should create ExecutionError from code', () => {
      const error = createExecutionError('ALREADY_RUNNING');

      expect(error).toBeInstanceOf(ExecutionError);
      expect(error.code).toBe('ALREADY_RUNNING');
    });

    it('should accept optional details', () => {
      const error = createExecutionError('EXECUTION_NOT_RUNNING', 'Process PID not found');

      expect(error.details).toBe('Process PID not found');
    });
  });
});

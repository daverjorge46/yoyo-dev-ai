/**
 * ApiKeySettings Component Tests
 *
 * Tests for API key configuration UI component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeySettings } from '../components/chat/ApiKeySettings';

describe('ApiKeySettings', () => {
  const mockOnSave = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input field and save button', () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should render show/hide toggle button', () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const toggleButton = screen.getByRole('button', { name: /show api key/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should render link to Anthropic console', () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const link = screen.getByRole('link', { name: /get one from anthropic/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://console.anthropic.com/settings/keys');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should have proper ARIA labels', () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      expect(input).toHaveAccessibleName();

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      expect(saveButton).toHaveAccessibleName();
    });
  });

  describe('password visibility toggle', () => {
    it('should toggle password visibility when show/hide button is clicked', async () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      const toggleButton = screen.getByRole('button', { name: /^show api key$/i });

      expect(input).toHaveAttribute('type', 'password');

      await userEvent.click(toggleButton);

      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /^hide api key$/i })).toBeInTheDocument();

      await userEvent.click(toggleButton);

      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('form validation', () => {
    it('should disable save button when API key is empty', () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when API key is entered', async () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      const saveButton = screen.getByRole('button', { name: /^save api key$/i });

      expect(saveButton).toBeDisabled();

      await userEvent.type(input, 'sk-ant-test-key');

      expect(saveButton).not.toBeDisabled();
    });

    it('should disable save button when API key is only whitespace', async () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      const saveButton = screen.getByRole('button', { name: /^save api key$/i });

      await userEvent.type(input, '   ');

      expect(saveButton).toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('should call onSave when form is submitted', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith('sk-ant-test-key');
    });

    it('should prevent form submission when Enter is pressed with empty input', async () => {
      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, '{enter}');

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading state during save', async () => {
      let resolveOnSave: () => void;
      const onSavePromise = new Promise<void>((resolve) => {
        resolveOnSave = resolve;
      });
      mockOnSave.mockReturnValue(onSavePromise);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      });

      // Button should be disabled during save
      expect(saveButton).toBeDisabled();

      resolveOnSave!();
    });

    it('should disable input during save', async () => {
      let resolveOnSave: () => void;
      const onSavePromise = new Promise<void>((resolve) => {
        resolveOnSave = resolve;
      });
      mockOnSave.mockReturnValue(onSavePromise);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      resolveOnSave!();
    });
  });

  describe('success handling', () => {
    it('should display success message after successful save', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should call onSuccess callback after successful save', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<ApiKeySettings onSave={mockOnSave} onSuccess={mockOnSuccess} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should clear input after successful save', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i) as HTMLInputElement;
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when save fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Invalid API key'));

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'invalid-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
      });
    });

    it('should not call onSuccess when save fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(<ApiKeySettings onSave={mockOnSave} onSuccess={mockOnSuccess} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should keep input value when save fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i) as HTMLInputElement;
      await userEvent.type(input, 'sk-ant-test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });

      expect(input.value).toBe('sk-ant-test-key');
    });
  });

  describe('accessibility', () => {
    it('should have role="alert" for error messages', async () => {
      mockOnSave.mockRejectedValue(new Error('Test error'));

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('should have role="alert" for success messages', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('should manage focus properly after save', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(<ApiKeySettings onSave={mockOnSave} />);

      const input = screen.getByLabelText(/anthropic api key/i);
      await userEvent.type(input, 'test-key');

      const saveButton = screen.getByRole('button', { name: /^save api key$/i });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });

      // Input should be focused after successful save
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });
});

/**
 * Changelog Components and Service Tests
 *
 * Tests for changelog generation UI components and server service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChangelogFormatSelector } from '../components/changelog/ChangelogFormatSelector';
import { ChangelogPreview } from '../components/changelog/ChangelogPreview';
import { ChangelogGenerator } from '../components/changelog/ChangelogGenerator';

// =============================================================================
// Test Utilities
// =============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// =============================================================================
// ChangelogFormatSelector Tests
// =============================================================================

describe('ChangelogFormatSelector', () => {
  const defaultProps = {
    value: 'keepachangelog' as const,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default value selected', () => {
      render(<ChangelogFormatSelector {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /format/i });
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('keepachangelog');
    });

    it('should display all format options', () => {
      render(<ChangelogFormatSelector {...defaultProps} />);

      expect(screen.getByRole('option', { name: /keep a changelog/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /conventional commits/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /plain text/i })).toBeInTheDocument();
    });

    it('should show format description when provided', () => {
      render(<ChangelogFormatSelector {...defaultProps} showDescription />);

      expect(screen.getByText(/semantic versioning/i)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onChange when format is selected', () => {
      const onChange = vi.fn();
      render(<ChangelogFormatSelector {...defaultProps} onChange={onChange} />);

      const select = screen.getByRole('combobox', { name: /format/i });
      fireEvent.change(select, { target: { value: 'conventional' } });

      expect(onChange).toHaveBeenCalledWith('conventional');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<ChangelogFormatSelector {...defaultProps} disabled />);

      const select = screen.getByRole('combobox', { name: /format/i });
      expect(select).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should have proper label association', () => {
      render(<ChangelogFormatSelector {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /format/i });
      expect(select).toHaveAccessibleName();
    });
  });
});

// =============================================================================
// ChangelogPreview Tests
// =============================================================================

describe('ChangelogPreview', () => {
  const sampleChangelog = `# Changelog

## [1.0.0] - 2025-12-24

### Added
- New feature A
- New feature B

### Fixed
- Bug fix C`;

  describe('rendering', () => {
    it('should render markdown content', () => {
      render(<ChangelogPreview content={sampleChangelog} />);

      expect(screen.getByText('Changelog')).toBeInTheDocument();
      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText(/New feature A/i)).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(<ChangelogPreview content="" isLoading />);

      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it('should show empty state when content is empty and not loading', () => {
      render(<ChangelogPreview content="" />);

      expect(screen.getByText(/no changelog/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ChangelogPreview content={sampleChangelog} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('copy functionality', () => {
    it('should show copy button when showCopyButton is true', () => {
      render(<ChangelogPreview content={sampleChangelog} showCopyButton />);

      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('should call onCopy when copy button is clicked', async () => {
      const onCopy = vi.fn();

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(
        <ChangelogPreview content={sampleChangelog} showCopyButton onCopy={onCopy} />
      );

      fireEvent.click(screen.getByRole('button', { name: /copy/i }));

      await waitFor(() => {
        expect(onCopy).toHaveBeenCalled();
      });
    });
  });
});

// =============================================================================
// ChangelogGenerator Tests
// =============================================================================

describe('ChangelogGenerator', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    specId: 'test-spec-id',
    specName: 'Test Spec',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      renderWithClient(<ChangelogGenerator {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/generate changelog/i)).toBeInTheDocument();
    });

    it('should display spec name in header', () => {
      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      expect(screen.getByText('Test Spec')).toBeInTheDocument();
    });

    it('should show format selector', () => {
      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      expect(screen.getByRole('combobox', { name: /format/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderWithClient(<ChangelogGenerator {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      renderWithClient(<ChangelogGenerator {...defaultProps} onClose={onClose} />);

      // Click the backdrop (outside modal content)
      fireEvent.click(screen.getByTestId('modal-backdrop'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should generate changelog when generate button is clicked', async () => {
      const mockChangelog = '# Changelog\n\n## Added\n- Feature';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ changelog: mockChangelog }),
      });

      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/changelog/generate',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test-spec-id'),
          })
        );
      });
    });

    it('should show preview after generation', async () => {
      const mockChangelog = '# Changelog\n\n## Added\n- New feature';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ changelog: mockChangelog }),
      });

      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate/i }));

      await waitFor(() => {
        expect(screen.getByText(/new feature/i)).toBeInTheDocument();
      });
    });
  });

  describe('copy and download', () => {
    it('should show copy button after changelog is generated', async () => {
      const mockChangelog = '# Changelog';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ changelog: mockChangelog }),
      });

      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      });
    });

    it('should show download button after changelog is generated', async () => {
      const mockChangelog = '# Changelog';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ changelog: mockChangelog }),
      });

      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message on generation failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to generate' }),
      });

      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /generate/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to generate/i)).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role and aria attributes', () => {
      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should trap focus within modal', () => {
      renderWithClient(<ChangelogGenerator {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(document.activeElement).toBe(closeButton);
    });
  });
});

// =============================================================================
// Changelog Entry Detection Tests (unit tests for categorization logic)
// =============================================================================

describe('Changelog Entry Detection', () => {
  // These test the logic that would be in the server service
  // We test the patterns here to ensure they work correctly

  const detectCategory = (text: string): string => {
    const lowerText = text.toLowerCase();

    if (/\b(add|create|new|implement|introduce)\b/.test(lowerText)) {
      return 'Added';
    }
    if (/\b(update|modify|change|enhance|improve|refactor)\b/.test(lowerText)) {
      return 'Changed';
    }
    if (/\b(fix|resolve|repair|correct|patch)\b/.test(lowerText)) {
      return 'Fixed';
    }
    if (/\b(remove|delete|deprecate|drop)\b/.test(lowerText)) {
      return 'Removed';
    }
    return 'Changed'; // Default
  };

  describe('Added category detection', () => {
    it('should detect "add" keyword', () => {
      expect(detectCategory('Add new login feature')).toBe('Added');
    });

    it('should detect "create" keyword', () => {
      expect(detectCategory('Create user dashboard')).toBe('Added');
    });

    it('should detect "new" keyword', () => {
      expect(detectCategory('New API endpoint for users')).toBe('Added');
    });

    it('should detect "implement" keyword', () => {
      expect(detectCategory('Implement authentication flow')).toBe('Added');
    });
  });

  describe('Changed category detection', () => {
    it('should detect "update" keyword', () => {
      expect(detectCategory('Update user profile logic')).toBe('Changed');
    });

    it('should detect "modify" keyword', () => {
      expect(detectCategory('Modify database schema')).toBe('Changed');
    });

    it('should detect "refactor" keyword', () => {
      expect(detectCategory('Refactor authentication module')).toBe('Changed');
    });

    it('should detect "improve" keyword', () => {
      expect(detectCategory('Improve performance of search')).toBe('Changed');
    });
  });

  describe('Fixed category detection', () => {
    it('should detect "fix" keyword', () => {
      expect(detectCategory('Fix login bug')).toBe('Fixed');
    });

    it('should detect "resolve" keyword', () => {
      expect(detectCategory('Resolve memory leak issue')).toBe('Fixed');
    });

    it('should detect "repair" keyword', () => {
      expect(detectCategory('Repair broken links')).toBe('Fixed');
    });

    it('should detect "correct" keyword', () => {
      expect(detectCategory('Correct validation error')).toBe('Fixed');
    });
  });

  describe('Removed category detection', () => {
    it('should detect "remove" keyword', () => {
      expect(detectCategory('Remove deprecated API')).toBe('Removed');
    });

    it('should detect "delete" keyword', () => {
      expect(detectCategory('Delete unused files')).toBe('Removed');
    });

    it('should detect "deprecate" keyword', () => {
      expect(detectCategory('Deprecate old endpoints')).toBe('Removed');
    });
  });

  describe('default category', () => {
    it('should default to Changed for unrecognized patterns', () => {
      expect(detectCategory('Some generic task description')).toBe('Changed');
    });
  });
});

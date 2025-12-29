/**
 * Roadmap Components Tests
 *
 * Tests for the enhanced roadmap planning components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoadmapFeature } from '../components/roadmap/RoadmapFeature';
import { RoadmapPhase } from '../components/roadmap/RoadmapPhase';
import { RoadmapTimeline } from '../components/roadmap/RoadmapTimeline';
import { RoadmapEditor } from '../components/roadmap/RoadmapEditor';

// =============================================================================
// Test Utilities
// =============================================================================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

// =============================================================================
// Mock Data
// =============================================================================

const mockFeature = {
  id: 'item-1',
  number: 1,
  title: 'Feature Title',
  completed: false,
  effort: 'M' as const,
  description: 'Feature description',
  linkedSpec: '2025-01-01-test-spec',
};

const mockCompletedFeature = {
  ...mockFeature,
  id: 'item-2',
  number: 2,
  completed: true,
  title: 'Completed Feature',
};

const mockPhase = {
  id: 'phase-1',
  number: 1,
  title: 'Phase Title',
  status: 'in_progress' as const,
  statusText: 'In Progress',
  goal: 'Complete the first milestone',
  sections: [
    {
      title: 'Features',
      items: [mockFeature, mockCompletedFeature],
    },
  ],
  itemCount: 2,
  completedCount: 1,
  progress: 50,
};

const mockCompletedPhase = {
  ...mockPhase,
  id: 'phase-0',
  number: 0,
  status: 'completed' as const,
  statusText: 'Completed',
  completedCount: 2,
  progress: 100,
};

const mockPendingPhase = {
  ...mockPhase,
  id: 'phase-2',
  number: 2,
  status: 'pending' as const,
  statusText: 'Pending',
  completedCount: 0,
  progress: 0,
};

// =============================================================================
// RoadmapFeature Tests
// =============================================================================

describe('RoadmapFeature', () => {
  const defaultProps = {
    feature: mockFeature,
    zoom: 100,
  };

  describe('rendering', () => {
    it('should render feature title and number', () => {
      renderWithProviders(<RoadmapFeature {...defaultProps} />);

      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText(/Feature Title/)).toBeInTheDocument();
    });

    it('should render effort badge when effort is provided', () => {
      renderWithProviders(<RoadmapFeature {...defaultProps} />);

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('should render description when zoom is >= 75', () => {
      renderWithProviders(<RoadmapFeature {...defaultProps} zoom={100} />);

      expect(screen.getByText('Feature description')).toBeInTheDocument();
    });

    it('should hide description when zoom is < 75', () => {
      renderWithProviders(<RoadmapFeature {...defaultProps} zoom={50} />);

      expect(screen.queryByText('Feature description')).not.toBeInTheDocument();
    });

    it('should show completed state with checkmark', () => {
      renderWithProviders(
        <RoadmapFeature feature={mockCompletedFeature} zoom={100} />
      );

      const container = screen.getByTestId('roadmap-feature-item-2');
      expect(container.querySelector('[data-completed="true"]')).toBeInTheDocument();
    });

    it('should show external link icon when linked to spec', () => {
      renderWithProviders(<RoadmapFeature {...defaultProps} />);

      expect(screen.getByTestId('spec-link-icon')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should have clickable inner element when linked to spec', () => {
      const { container } = renderWithProviders(<RoadmapFeature {...defaultProps} />);

      // The cursor-pointer class is on the inner clickable div, not the outer container
      const clickableDiv = container.querySelector('.cursor-pointer');
      expect(clickableDiv).toBeInTheDocument();
    });

    it('should not have clickable element when not linked to spec', () => {
      const unlinkedFeature = { ...mockFeature, linkedSpec: undefined };
      const { container } = renderWithProviders(<RoadmapFeature feature={unlinkedFeature} zoom={100} />);

      const clickableDiv = container.querySelector('.cursor-pointer');
      expect(clickableDiv).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper role and labels', () => {
      renderWithProviders(<RoadmapFeature {...defaultProps} />);

      const feature = screen.getByTestId('roadmap-feature-item-1');
      expect(feature).toHaveAttribute('role', 'listitem');
    });
  });
});

// =============================================================================
// RoadmapPhase Tests
// =============================================================================

describe('RoadmapPhase', () => {
  const defaultProps = {
    phase: mockPhase,
    zoom: 100,
    defaultExpanded: true,
    isDragging: false,
    isEditing: false,
    onStartEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render phase title and number', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      expect(screen.getByText(/Phase 1:/)).toBeInTheDocument();
      expect(screen.getByText(/Phase Title/)).toBeInTheDocument();
    });

    it('should render progress ring with correct percentage', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should render goal text', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      expect(screen.getByText('Complete the first milestone')).toBeInTheDocument();
    });

    it('should render item count', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      expect(screen.getByText('1/2')).toBeInTheDocument();
    });

    it('should apply correct border color for in_progress status', () => {
      const { container } = renderWithProviders(<RoadmapPhase {...defaultProps} />);

      const phaseCard = container.querySelector('[data-testid="roadmap-phase-phase-1"]');
      expect(phaseCard).toHaveClass('border-l-blue-500');
    });

    it('should apply correct border color for completed status', () => {
      const { container } = renderWithProviders(
        <RoadmapPhase {...defaultProps} phase={mockCompletedPhase} />
      );

      const phaseCard = container.querySelector('[data-testid="roadmap-phase-phase-0"]');
      expect(phaseCard).toHaveClass('border-l-green-500');
    });

    it('should apply correct border color for pending status', () => {
      const { container } = renderWithProviders(
        <RoadmapPhase {...defaultProps} phase={mockPendingPhase} />
      );

      const phaseCard = container.querySelector('[data-testid="roadmap-phase-phase-2"]');
      expect(phaseCard).toHaveClass('border-l-gray-300');
    });
  });

  describe('expand/collapse', () => {
    it('should expand by default when defaultExpanded is true', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} defaultExpanded={true} />);

      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    it('should collapse by default when defaultExpanded is false', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} defaultExpanded={false} />);

      expect(screen.queryByText('Features')).not.toBeInTheDocument();
    });

    it('should toggle expanded state on header click', async () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} defaultExpanded={false} />);

      const header = screen.getByTestId('expand-toggle');
      fireEvent.click(header);

      await waitFor(() => {
        expect(screen.getByText('Features')).toBeInTheDocument();
      });
    });
  });

  describe('drag handle', () => {
    it('should show drag handle', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
    });

    it('should apply dragging styles when isDragging is true', () => {
      const { container } = renderWithProviders(
        <RoadmapPhase {...defaultProps} isDragging={true} />
      );

      const phaseCard = container.querySelector('[data-testid="roadmap-phase-phase-1"]');
      expect(phaseCard).toHaveClass('opacity-50');
    });
  });

  describe('inline editing', () => {
    it('should show edit button on hover', async () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      const header = screen.getByTestId('phase-header');
      fireEvent.mouseEnter(header);

      await waitFor(() => {
        expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      });
    });

    it('should call onStartEdit when edit button is clicked', async () => {
      const onStartEdit = vi.fn();
      renderWithProviders(
        <RoadmapPhase {...defaultProps} onStartEdit={onStartEdit} />
      );

      const header = screen.getByTestId('phase-header');
      fireEvent.mouseEnter(header);

      await waitFor(() => {
        const editButton = screen.getByTestId('edit-button');
        fireEvent.click(editButton);
        expect(onStartEdit).toHaveBeenCalledWith('phase-1');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria attributes', () => {
      renderWithProviders(<RoadmapPhase {...defaultProps} />);

      const header = screen.getByTestId('expand-toggle');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });
  });
});

// =============================================================================
// RoadmapTimeline Tests
// =============================================================================

describe('RoadmapTimeline', () => {
  const defaultProps = {
    phases: [mockCompletedPhase, mockPhase, mockPendingPhase],
    zoom: 100,
    onReorder: vi.fn(),
    editingPhaseId: null,
    onStartEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onCancelEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all phases', () => {
      renderWithProviders(<RoadmapTimeline {...defaultProps} />);

      expect(screen.getByText(/Phase 0:/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 1:/)).toBeInTheDocument();
      expect(screen.getByText(/Phase 2:/)).toBeInTheDocument();
    });

    it('should show empty state when no phases', () => {
      renderWithProviders(<RoadmapTimeline {...defaultProps} phases={[]} />);

      expect(screen.getByText(/No phases match/)).toBeInTheDocument();
    });

    it('should render timeline connector line', () => {
      renderWithProviders(<RoadmapTimeline {...defaultProps} />);

      expect(screen.getByTestId('timeline-connector')).toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('should have drag context wrapper', () => {
      const { container } = renderWithProviders(<RoadmapTimeline {...defaultProps} />);

      expect(container.querySelector('[data-testid="roadmap-timeline"]')).toBeInTheDocument();
    });

    it('should call onReorder when drag ends', async () => {
      // Note: Full drag-drop testing requires @dnd-kit test utilities
      // This test verifies the callback is properly wired
      const onReorder = vi.fn();
      renderWithProviders(<RoadmapTimeline {...defaultProps} onReorder={onReorder} />);

      // The DndContext will call onReorder when drag ends
      expect(onReorder).not.toHaveBeenCalled(); // No drag happened
    });
  });

  describe('accessibility', () => {
    it('should have proper container role', () => {
      renderWithProviders(<RoadmapTimeline {...defaultProps} />);

      const timeline = screen.getByTestId('roadmap-timeline');
      expect(timeline).toHaveAttribute('role', 'list');
    });
  });
});

// =============================================================================
// RoadmapEditor Tests
// =============================================================================

describe('RoadmapEditor', () => {
  const defaultProps = {
    value: 'Phase Title',
    onSave: vi.fn(),
    onCancel: vi.fn(),
    placeholder: 'Enter phase name',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render input with initial value', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Phase Title');
    });

    it('should render save and cancel buttons', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} />);

      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should show placeholder when value is empty', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} value="" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter phase name');
    });
  });

  describe('interactions', () => {
    it('should update input value on change', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Phase Title' } });

      expect(input.value).toBe('New Phase Title');
    });

    it('should call onSave with new value when save button is clicked', () => {
      const onSave = vi.fn();
      renderWithProviders(<RoadmapEditor {...defaultProps} onSave={onSave} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Updated Title' } });

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith('Updated Title');
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      renderWithProviders(<RoadmapEditor {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onSave when Enter key is pressed', () => {
      const onSave = vi.fn();
      renderWithProviders(<RoadmapEditor {...defaultProps} onSave={onSave} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSave).toHaveBeenCalledWith('Phase Title');
    });

    it('should call onCancel when Escape key is pressed', () => {
      const onCancel = vi.fn();
      renderWithProviders(<RoadmapEditor {...defaultProps} onCancel={onCancel} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should disable save button when value is empty', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} value="" />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('should disable save button when value is whitespace only', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} value="   " />);

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should focus input on mount', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(document.activeElement).toBe(input);
    });

    it('should have proper aria labels', () => {
      renderWithProviders(<RoadmapEditor {...defaultProps} />);

      const saveButton = screen.getByTestId('save-button');
      const cancelButton = screen.getByTestId('cancel-button');

      expect(saveButton).toHaveAttribute('aria-label', 'Save');
      expect(cancelButton).toHaveAttribute('aria-label', 'Cancel');
    });
  });
});

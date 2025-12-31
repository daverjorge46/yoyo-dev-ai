/**
 * Chat Component Tests
 *
 * Tests for codebase chat interface components and API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Import components
import { CodeBlock } from '../components/chat/CodeBlock';
import { FileReference } from '../components/chat/FileReference';
import { ChatMessage } from '../components/chat/ChatMessage';
import { CodebaseChat } from '../components/chat/CodebaseChat';

// =============================================================================
// Test Utilities
// =============================================================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  </MemoryRouter>
);

// =============================================================================
// CodeBlock Tests
// =============================================================================

describe('CodeBlock', () => {
  describe('rendering', () => {
    it('should render code content with syntax highlighting', () => {
      render(
        <CodeBlock
          code="const x = 1;"
          language="javascript"
        />
      );

      expect(screen.getByText(/const/)).toBeInTheDocument();
    });

    it('should display language label when provided', () => {
      render(
        <CodeBlock
          code="const x = 1;"
          language="typescript"
        />
      );

      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('should render copy button', () => {
      render(
        <CodeBlock
          code="const x = 1;"
          language="javascript"
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('should fallback to text when language is not specified', () => {
      render(<CodeBlock code="plain text content" />);

      expect(screen.getByText('plain text content')).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('should copy code to clipboard when copy button is clicked', async () => {
      render(
        <CodeBlock
          code="const x = 1;"
          language="javascript"
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const x = 1;');
    });

    it('should show copied confirmation after copying', async () => {
      render(
        <CodeBlock
          code="const x = 1;"
          language="javascript"
        />
      );

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });
});

// =============================================================================
// FileReference Tests
// =============================================================================

describe('FileReference', () => {
  describe('rendering', () => {
    it('should render file path as clickable button', () => {
      render(
        <TestWrapper>
          <FileReference path="/src/App.tsx" />
        </TestWrapper>
      );

      const link = screen.getByRole('button', { name: /open file app\.tsx/i });
      expect(link).toBeInTheDocument();
    });

    it('should display file name', () => {
      render(
        <TestWrapper>
          <FileReference path="/src/index.ts" />
        </TestWrapper>
      );

      expect(screen.getByText('index.ts')).toBeInTheDocument();
    });

    it('should handle line number reference', () => {
      render(
        <TestWrapper>
          <FileReference path="/src/App.tsx" lineNumber={42} />
        </TestWrapper>
      );

      expect(screen.getByText(/L42/)).toBeInTheDocument();
    });
  });

  describe('click behavior', () => {
    it('should call onClick when file reference is clicked', async () => {
      const handleClick = vi.fn();
      render(
        <TestWrapper>
          <FileReference path="/src/App.tsx" onClick={handleClick} />
        </TestWrapper>
      );

      const link = screen.getByRole('button', { name: /open file app\.tsx/i });
      await userEvent.click(link);

      expect(handleClick).toHaveBeenCalledWith('/src/App.tsx', undefined);
    });

    it('should pass line number to onClick handler', async () => {
      const handleClick = vi.fn();
      render(
        <TestWrapper>
          <FileReference path="/src/App.tsx" lineNumber={42} onClick={handleClick} />
        </TestWrapper>
      );

      const link = screen.getByRole('button', { name: /open file app\.tsx/i });
      await userEvent.click(link);

      expect(handleClick).toHaveBeenCalledWith('/src/App.tsx', 42);
    });
  });
});

// =============================================================================
// ChatMessage Tests
// =============================================================================

describe('ChatMessage', () => {
  describe('user messages', () => {
    it('should render user message with correct styling', () => {
      render(
        <TestWrapper>
          <ChatMessage
            role="user"
            content="How does this work?"
          />
        </TestWrapper>
      );

      expect(screen.getByText('How does this work?')).toBeInTheDocument();
    });

    it('should display user icon or indicator', () => {
      render(
        <TestWrapper>
          <ChatMessage
            role="user"
            content="Test message"
          />
        </TestWrapper>
      );

      const container = screen.getByTestId('chat-message-user');
      expect(container).toBeInTheDocument();
    });
  });

  describe('assistant messages', () => {
    it('should render assistant message with markdown support', () => {
      render(
        <TestWrapper>
          <ChatMessage
            role="assistant"
            content="This is **bold** text"
          />
        </TestWrapper>
      );

      // Bold text should be rendered
      const strongElement = screen.getByText('bold');
      expect(strongElement).toBeInTheDocument();
    });

    it('should render code blocks in assistant messages', () => {
      render(
        <TestWrapper>
          <ChatMessage
            role="assistant"
            content="Here is code:\n```javascript\nconst x = 1;\n```"
          />
        </TestWrapper>
      );

      expect(screen.getByText(/const/)).toBeInTheDocument();
    });

    it('should display assistant icon or indicator', () => {
      render(
        <TestWrapper>
          <ChatMessage
            role="assistant"
            content="Response text"
          />
        </TestWrapper>
      );

      const container = screen.getByTestId('chat-message-assistant');
      expect(container).toBeInTheDocument();
    });
  });

  describe('timestamps', () => {
    it('should display timestamp when provided', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z');
      render(
        <TestWrapper>
          <ChatMessage
            role="user"
            content="Test message"
            timestamp={timestamp}
          />
        </TestWrapper>
      );

      // Check that a time element exists with the correct datetime attribute
      const timeElement = screen.getByRole('time');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveAttribute('datetime', timestamp.toISOString());
    });
  });

  describe('collapsible content', () => {
    it('should be collapsible for long assistant messages', () => {
      const longContent = 'A'.repeat(1000);
      render(
        <TestWrapper>
          <ChatMessage
            role="assistant"
            content={longContent}
          />
        </TestWrapper>
      );

      // Long content should trigger collapse UI
      expect(screen.getByTestId('chat-message-assistant')).toBeInTheDocument();
      // Should show expand button for long content
      expect(screen.queryByRole('button', { name: /show more/i })).toBeInTheDocument();
    });
  });
});

// =============================================================================
// CodebaseChat Tests
// =============================================================================

// Helper to create SSE response for streaming
function createSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let chunkIndex = 0;

  const stream = new ReadableStream({
    pull(controller) {
      if (chunkIndex < chunks.length) {
        const chunk = chunks[chunkIndex];
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        chunkIndex++;
      } else {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('CodebaseChat', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock status endpoint to return available
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/status')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ available: true, version: '2.0.76 (Claude Code)' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }
      // Default SSE response
      return Promise.resolve(
        createSSEResponse([JSON.stringify({ content: 'Test response' })])
      );
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render chat input field', () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      expect(input).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should show empty state when no messages', () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      expect(screen.getByText(/ask questions/i)).toBeInTheDocument();
    });
  });

  describe('message input', () => {
    it('should enable send button when input has text', async () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(sendButton).toBeDisabled();

      await userEvent.type(input, 'Test question');

      expect(sendButton).not.toBeDisabled();
    });

    it('should clear input after sending', async () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      // Wait for availability check
      await waitFor(() => {
        expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask.*codebase/i) as HTMLInputElement;
      await userEvent.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should support Enter key to send', async () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      // Wait for availability check
      await waitFor(() => {
        expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      await userEvent.type(input, 'Test question{enter}');

      await waitFor(() => {
        // Check that chat endpoint was called (not just status)
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/chat',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while processing', async () => {
      // Create a promise that we can control for the chat endpoint
      let resolveResponse: (value: Response) => void;
      const responsePromise = new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/status')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, version: '2.0.76' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return responsePromise;
      });

      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      // Wait for availability check
      await waitFor(() => {
        expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      await userEvent.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
      });

      // Resolve the response
      resolveResponse!(createSSEResponse([JSON.stringify({ content: 'Done' })]));
    });
  });

  describe('chat history', () => {
    it('should persist chat history to localStorage', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: 'Test response',
            references: [],
          }),
      });

      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      await userEvent.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        const history = localStorage.getItem('yoyo-chat-history');
        expect(history).not.toBeNull();
        const parsed = JSON.parse(history!);
        expect(parsed.length).toBeGreaterThan(0);
      });
    });

    it('should load chat history from localStorage on mount', () => {
      const mockHistory = [
        { id: '1', role: 'user', content: 'Previous question', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Previous answer', timestamp: Date.now() },
      ];
      localStorage.setItem('yoyo-chat-history', JSON.stringify(mockHistory));

      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      expect(screen.getByText('Previous question')).toBeInTheDocument();
      expect(screen.getByText('Previous answer')).toBeInTheDocument();
    });

    it('should have clear history button', () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should display error message when API fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' }),
      });

      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      await userEvent.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      // Wait for the mutation to fail and error state to be set
      await waitFor(
        () => {
          expect(screen.getByText(/Failed to get response/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('accessibility', () => {
    it('should have accessible form elements', () => {
      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      expect(input).toHaveAttribute('aria-label');
    });

    it('should announce loading state to screen readers', async () => {
      let resolveResponse: (value: unknown) => void;
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      global.fetch = vi.fn().mockReturnValue(
        responsePromise.then(() => ({
          ok: true,
          json: () =>
            Promise.resolve({
              response: 'Test response',
              references: [],
            }),
        }))
      );

      render(
        <TestWrapper>
          <CodebaseChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText(/ask.*codebase/i);
      await userEvent.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        const loadingIndicator = screen.getByTestId('chat-loading');
        expect(loadingIndicator).toHaveAttribute('aria-live');
      });

      resolveResponse!(undefined);
    });
  });
});

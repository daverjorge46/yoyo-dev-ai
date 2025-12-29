/**
 * Chat Page
 *
 * Full-page chat interface for codebase exploration.
 */

import { CodebaseChat } from '../components/chat';

export default function Chat() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <CodebaseChat className="rounded-lg shadow" />
    </div>
  );
}

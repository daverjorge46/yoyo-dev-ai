import React from 'react';
import { createRoot } from 'react-dom/client';
import { marked } from 'marked';

interface SpecViewerProps {}

const SpecViewer: React.FC<SpecViewerProps> = () => {
  const [content, setContent] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('Specification');

  React.useEffect(() => {
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'updateContent':
          setContent(message.content);
          setTitle(message.title || 'Specification');
          break;
      }
    });
  }, []);

  const htmlContent = content ? marked(content) : '<p>No content loaded</p>';

  return (
    <div style={{ padding: '20px', fontFamily: 'var(--vscode-font-family)' }}>
      <h1 style={{
        fontSize: '24px',
        marginBottom: '20px',
        color: 'var(--vscode-foreground)'
      }}>
        {title}
      </h1>
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          lineHeight: '1.6',
          color: 'var(--vscode-foreground)'
        }}
      />
    </div>
  );
};

// Mount React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SpecViewer />);
}

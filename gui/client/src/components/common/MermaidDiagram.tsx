/**
 * MermaidDiagram Component
 *
 * Renders Mermaid diagrams with dark mode support.
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  /** Mermaid diagram definition */
  definition: string;
  /** Optional className for styling */
  className?: string;
  /** Optional caption */
  caption?: string;
}

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#f9a825',
    primaryTextColor: '#fff',
    primaryBorderColor: '#f57f17',
    lineColor: '#888',
    secondaryColor: '#424242',
    tertiaryColor: '#333',
    background: '#1a1a1a',
    mainBkg: '#2a2a2a',
    nodeBorder: '#666',
    clusterBkg: '#333',
    clusterBorder: '#666',
    titleColor: '#fff',
    edgeLabelBackground: '#333',
  },
  flowchart: {
    curve: 'basis',
    padding: 20,
  },
});

export function MermaidDiagram({ definition, className = '', caption }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !definition.trim()) {
        return;
      }

      try {
        setError(null);

        // Validate the diagram syntax
        const isValid = await mermaid.parse(definition);

        if (!isValid) {
          setError('Invalid Mermaid syntax');
          return;
        }

        // Render the diagram
        const { svg } = await mermaid.render(idRef.current, definition);
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [definition]);

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-4 ${className}`}>
        <div className="text-red-400 text-sm mb-2">Failed to render diagram</div>
        <code className="text-xs text-gray-400 block whitespace-pre-wrap">{error}</code>
      </div>
    );
  }

  return (
    <div className={`mermaid-diagram ${className}`}>
      <div
        ref={containerRef}
        className="overflow-x-auto bg-terminal-bg-secondary rounded-lg p-4"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {caption && (
        <p className="text-center text-sm text-gray-500 mt-2 italic">{caption}</p>
      )}
    </div>
  );
}

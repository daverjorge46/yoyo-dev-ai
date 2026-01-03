/**
 * MarkdownEditor Component
 *
 * CodeMirror 6 based markdown editor with syntax highlighting.
 */

import { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  className?: string;
  readOnly?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  className = '',
  readOnly = false,
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isUpdatingRef = useRef(false);

  // Handle save shortcut
  const handleSave = useCallback(() => {
    onSave?.();
    return true;
  }, [onSave]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Custom keymap for save
    const customKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: handleSave,
      },
      // Bold
      {
        key: 'Mod-b',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selectedText = view.state.doc.sliceString(from, to);
          view.dispatch({
            changes: { from, to, insert: `**${selectedText}**` },
            selection: { anchor: from + 2, head: to + 2 },
          });
          return true;
        },
      },
      // Italic
      {
        key: 'Mod-i',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selectedText = view.state.doc.sliceString(from, to);
          view.dispatch({
            changes: { from, to, insert: `*${selectedText}*` },
            selection: { anchor: from + 1, head: to + 1 },
          });
          return true;
        },
      },
      // Code
      {
        key: 'Mod-`',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selectedText = view.state.doc.sliceString(from, to);
          view.dispatch({
            changes: { from, to, insert: `\`${selectedText}\`` },
            selection: { anchor: from + 1, head: to + 1 },
          });
          return true;
        },
      },
      // Link
      {
        key: 'Mod-k',
        run: (view) => {
          const { from, to } = view.state.selection.main;
          const selectedText = view.state.doc.sliceString(from, to);
          const linkText = selectedText || 'link text';
          view.dispatch({
            changes: { from, to, insert: `[${linkText}](url)` },
            selection: { anchor: from + linkText.length + 3, head: from + linkText.length + 6 },
          });
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        markdown(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle),
        customKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isUpdatingRef.current) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.editable.of(!readOnly),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          },
          '.cm-content': {
            padding: '16px 0',
          },
          '.cm-line': {
            padding: '0 16px',
          },
          '.cm-gutters': {
            backgroundColor: '#171717', // terminal.darkGray
            borderRight: '1px solid #3f3f46', // terminal.border
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [handleSave, readOnly]); // Only recreate on these changes

  // Update editor content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      isUpdatingRef.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
      isUpdatingRef.current = false;
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`h-full overflow-hidden bg-terminal-card ${className}`}
    />
  );
}

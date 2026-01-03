/**
 * AgentImportModal Component
 *
 * Modal for importing agent definition files.
 */

import { useState } from 'react';
import { X, Upload, FileText, AlertCircle, Check } from 'lucide-react';
import { FileDropzone } from '../common/FileDropzone';

interface ParsedAgent {
  name: string;
  description: string;
  model: string;
  temperature: number;
  mode: string;
}

interface AgentImportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Import handler */
  onImport: (content: string, filename: string) => Promise<void>;
  /** Additional className */
  className?: string;
}

export function AgentImportModal({
  isOpen,
  onClose,
  onImport,
  className = '',
}: AgentImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string>('');
  const [parsedAgent, setParsedAgent] = useState<ParsedAgent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const parseAgentContent = (text: string): ParsedAgent | null => {
    try {
      // Extract frontmatter
      const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        throw new Error('No YAML frontmatter found');
      }

      const frontmatter = frontmatterMatch[1];
      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      const descMatch = frontmatter.match(/description:\s*(.+)/);

      // Extract model from content
      const modelMatch = text.match(/\*\*Model:\*\*\s*([^\n(]+)/i);
      const tempMatch = text.match(/\*\*Temperature:\*\*\s*([\d.]+)/i);
      const modeMatch = text.match(/\*\*Mode:\*\*\s*([^\n]+)/i);

      return {
        name: nameMatch?.[1]?.trim() || 'Unknown',
        description: descMatch?.[1]?.trim() || 'No description',
        model: modelMatch?.[1]?.trim() || 'Unknown',
        temperature: parseFloat(tempMatch?.[1] || '0.7'),
        mode: modeMatch?.[1]?.trim().includes('Primary') ? 'Primary' : 'Subagent',
      };
    } catch {
      return null;
    }
  };

  const handleFileDrop = async (files: File[]) => {
    const selectedFile = files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    try {
      const text = await selectedFile.text();
      setContent(text);

      const parsed = parseAgentContent(text);
      if (!parsed) {
        setError('Could not parse agent file. Make sure it has YAML frontmatter.');
        setParsedAgent(null);
      } else {
        setParsedAgent(parsed);
      }
    } catch (err) {
      setError('Failed to read file');
      setParsedAgent(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setContent('');
    setParsedAgent(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!content || !file) return;

    setIsImporting(true);
    setError(null);

    try {
      await onImport(content, file.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import agent');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setContent('');
    setParsedAgent(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`bg-terminal-bg-primary border border-terminal-border rounded-lg w-full max-w-lg mx-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-border">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-terminal-orange" />
            <h2 className="text-lg font-semibold text-white">Import Agent</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded hover:bg-terminal-bg-tertiary text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* File dropzone */}
          <FileDropzone
            onDrop={handleFileDrop}
            accept={{ 'text/markdown': ['.md'] }}
            files={file ? [file] : []}
            onRemove={handleRemoveFile}
            error={error || undefined}
          />

          {/* Parsed preview */}
          {parsedAgent && (
            <div className="bg-terminal-bg-secondary border border-terminal-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">File parsed successfully</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{parsedAgent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className={parsedAgent.mode === 'Primary' ? 'text-terminal-orange' : 'text-terminal-cyan'}>
                    {parsedAgent.mode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Model:</span>
                  <span className="text-white">{parsedAgent.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Temperature:</span>
                  <span className="text-white">{parsedAgent.temperature.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Description:</span>
                  <p className="text-gray-300 mt-1 text-xs line-clamp-2">{parsedAgent.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && !file && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Info */}
          <p className="text-xs text-gray-500">
            Import agent definition files (.md) with YAML frontmatter. The file should contain name,
            description, model, and temperature settings.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-terminal-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-terminal-bg-tertiary text-gray-300 hover:bg-terminal-bg-quaternary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedAgent || isImporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-orange text-black font-medium hover:bg-terminal-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            <span>{isImporting ? 'Importing...' : 'Import Agent'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

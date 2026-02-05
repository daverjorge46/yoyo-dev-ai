import { useState } from 'react';
import {
  FileText,
  FolderOpen,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card } from '../common/Card';
import { useGatewayQuery, useGatewayRequest } from '../../hooks/useGatewayRPC';
import type { Agent, AgentFilesListResponse, AgentFileGetResponse } from '../../lib/gateway-types';

interface AgentFilesProps {
  agent: Agent;
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
    toml: 'toml', py: 'python', sh: 'bash', bash: 'bash',
    css: 'css', html: 'html', sql: 'sql', rs: 'rust',
    go: 'go', txt: 'text',
  };
  return langMap[ext] || 'text';
}

export function AgentFiles({ agent }: AgentFilesProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const request = useGatewayRequest();

  const { data: filesData, isLoading } = useGatewayQuery<AgentFilesListResponse>(
    'agents.files.list',
    { agentKey: agent.key },
    { staleTime: 30_000 },
  );

  const files = filesData?.files || [];

  const handleFileClick = async (path: string) => {
    if (selectedFile === path) {
      setSelectedFile(null);
      setFileContent(null);
      return;
    }

    setSelectedFile(path);
    setFileContent(null);
    setLoadingFile(true);

    try {
      const res = await request<AgentFileGetResponse>('agents.files.get', {
        agentKey: agent.key,
        path,
      });
      setFileContent(res.content);
    } catch {
      setFileContent('// Failed to load file content');
    } finally {
      setLoadingFile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FolderOpen className="w-12 h-12 mx-auto text-terminal-text-muted mb-3 opacity-50" />
        <h3 className="text-sm font-medium text-terminal-text mb-1">No files</h3>
        <p className="text-xs text-terminal-text-muted">
          This agent has no workspace files.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div key={file.path}>
          <Card
            variant="hover"
            className="cursor-pointer"
            onClick={() => handleFileClick(file.path)}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <FileText className={`w-4 h-4 flex-shrink-0 ${
                selectedFile === file.path ? 'text-primary-400' : 'text-terminal-text-muted'
              }`} />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-terminal-text font-mono truncate block">
                  {file.path}
                </span>
              </div>
              {file.size != null && (
                <span className="text-xs text-terminal-text-muted">
                  {formatFileSize(file.size)}
                </span>
              )}
              <ChevronRight className={`w-4 h-4 text-terminal-text-muted transition-transform ${
                selectedFile === file.path ? 'rotate-90' : ''
              }`} />
            </div>
          </Card>

          {/* File content preview */}
          {selectedFile === file.path && (
            <div className="mt-1 rounded-lg overflow-hidden border border-terminal-border">
              <div className="flex items-center justify-between px-3 py-2 bg-terminal-elevated text-xs">
                <span className="text-terminal-text-muted font-mono">{file.path}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setFileContent(null);
                  }}
                  className="p-0.5 hover:bg-terminal-surface rounded"
                >
                  <X className="w-3 h-3 text-terminal-text-muted" />
                </button>
              </div>
              {loadingFile ? (
                <div className="flex items-center justify-center py-8 bg-terminal-surface">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                </div>
              ) : fileContent != null ? (
                <SyntaxHighlighter
                  language={getFileLanguage(file.path)}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '12px',
                    maxHeight: '400px',
                  }}
                  showLineNumbers
                >
                  {fileContent}
                </SyntaxHighlighter>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

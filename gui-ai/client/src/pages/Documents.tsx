import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Search,
  Eye,
  Sparkles,
  MessageSquare,
  Download,
  Trash2,
  Image,
  File,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoader } from '../components/common/LoadingSpinner';
import type { Document } from '../types';

const SOURCE_ICONS: Record<string, React.ElementType> = {
  upload: Upload,
  drive: FolderOpen,
  email: FileText,
  generated: Sparkles,
};

const SOURCE_COLORS: Record<string, string> = {
  upload: 'text-primary-400',
  drive: 'text-info-light',
  email: 'text-accent-400',
  generated: 'text-success-light',
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Document card component
function DocumentCard({
  document,
  onView,
  onSummarize,
  onAsk,
  onDelete,
}: {
  document: Document;
  onView: () => void;
  onSummarize: () => void;
  onAsk: () => void;
  onDelete: () => void;
}) {
  const FileIcon = getFileIcon(document.mimeType);
  const SourceIcon = SOURCE_ICONS[document.source] || File;
  const sourceColor = SOURCE_COLORS[document.source] || 'text-terminal-text-secondary';

  return (
    <Card variant="hover" className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-terminal-elevated">
          <FileIcon className="w-5 h-5 text-terminal-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-terminal-text truncate">{document.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <SourceIcon className={`w-3 h-3 ${sourceColor}`} />
            <span className="text-xs text-terminal-text-muted capitalize">{document.source}</span>
            <span className="text-xs text-terminal-text-muted">•</span>
            <span className="text-xs text-terminal-text-muted">{formatFileSize(document.size)}</span>
          </div>
          {document.summary && (
            <p className="text-xs text-terminal-text-secondary mt-2 line-clamp-2">
              {document.summary}
            </p>
          )}
          <p className="text-xs text-terminal-text-muted mt-2">
            {new Date(document.modifiedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-terminal-border">
        <Button size="sm" variant="ghost" onClick={onView}>
          <Eye className="w-3 h-3" /> View
        </Button>
        <Button size="sm" variant="ghost" onClick={onSummarize}>
          <Sparkles className="w-3 h-3" /> Summarize
        </Button>
        <Button size="sm" variant="ghost" onClick={onAsk}>
          <MessageSquare className="w-3 h-3" /> Ask AI
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

// Upload dropzone
function UploadDropzone({ onUpload }: { onUpload: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onUpload(files);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpload(files);
      }
      e.target.value = '';
    },
    [onUpload]
  );

  return (
    <label
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-terminal-border hover:border-terminal-border-emphasis hover:bg-terminal-elevated/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="w-10 h-10 text-terminal-text-muted mb-3" />
      <p className="text-sm text-terminal-text mb-1">Drop files here or click to upload</p>
      <p className="text-xs text-terminal-text-muted">PDF, DOCX, TXT, images up to 10MB</p>
      <input
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif"
      />
    </label>
  );
}

export default function Documents() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      return data.documents || [];
    },
  });

  // Upload mutation
  const uploadDocuments = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload documents');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Summarize mutation
  const summarizeDocument = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}/summarize`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to summarize document');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Delete mutation
  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Filter documents
  const filteredDocuments = documents.filter((d) => {
    const matchesSearch =
      !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = !selectedSource || d.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const sources = [...new Set(documents.map((d) => d.source))];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <h1 className="panel-title">Documents</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Upload area */}
        <div className="mb-6">
          <UploadDropzone onUpload={(files) => uploadDocuments.mutate(files)} />
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4 mb-6">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search documents..."
            className="w-64"
          />
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                !selectedSource
                  ? 'bg-terminal-elevated text-terminal-text'
                  : 'text-terminal-text-secondary hover:text-terminal-text'
              }`}
              onClick={() => setSelectedSource(null)}
            >
              All
            </button>
            {sources.map((source) => {
              const Icon = SOURCE_ICONS[source] || File;
              return (
                <button
                  key={source}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                    selectedSource === source
                      ? 'bg-terminal-elevated text-terminal-text'
                      : 'text-terminal-text-secondary hover:text-terminal-text'
                  }`}
                  onClick={() => setSelectedSource(source)}
                >
                  <Icon className="w-3 h-3" />
                  {source}
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents grid */}
        {filteredDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload documents or connect services to see them here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => window.open(`/api/documents/${doc.id}/view`, '_blank')}
                onSummarize={() => summarizeDocument.mutate(doc.id)}
                onAsk={() => {
                  // Navigate to chat with document context
                  window.location.href = `/chat?document=${doc.id}`;
                }}
                onDelete={() => deleteDocument.mutate(doc.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

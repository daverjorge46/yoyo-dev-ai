/**
 * FileDropzone Component
 *
 * Drag-and-drop file upload using react-dropzone.
 */

import { useCallback } from 'react';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  /** Callback when files are dropped */
  onDrop: (files: File[]) => void;
  /** Accepted file types (MIME types or extensions) */
  accept?: Accept;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Currently selected files */
  files?: File[];
  /** Callback to remove a file */
  onRemove?: (index: number) => void;
  /** Error message to display */
  error?: string;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function FileDropzone({
  onDrop,
  accept = { 'text/markdown': ['.md'] },
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB default
  files = [],
  onRemove,
  error,
  className = '',
  disabled = false,
}: FileDropzoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        console.warn('Rejected files:', rejections);
      }
      if (acceptedFiles.length > 0) {
        onDrop(acceptedFiles);
      }
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={className}>
      {/* Dropzone area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-terminal-orange hover:bg-terminal-bg-tertiary'}
          ${isDragActive && !isDragReject ? 'border-terminal-orange bg-terminal-orange/10' : 'border-terminal-border'}
          ${isDragReject ? 'border-red-500 bg-red-500/10' : ''}
          ${error ? 'border-red-500' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          {isDragReject ? (
            <>
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-red-400 font-medium">File type not accepted</p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="h-12 w-12 text-terminal-orange animate-bounce" />
              <p className="text-terminal-orange font-medium">Drop file here</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-500" />
              <div>
                <p className="text-gray-300 font-medium">
                  Drop file here or <span className="text-terminal-orange">browse</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {Object.values(accept).flat().join(', ')} files up to {formatFileSize(maxSize)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected files list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-500">Selected files:</p>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-terminal-bg-secondary border border-terminal-border rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <File className="h-5 w-5 text-terminal-orange flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 rounded hover:bg-terminal-bg-tertiary text-gray-400 hover:text-red-400 transition-colors"
                  title="Remove file"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CompactFileDropzone - Smaller dropzone for inline use
 */
interface CompactFileDropzoneProps {
  onDrop: (files: File[]) => void;
  accept?: Accept;
  label?: string;
  className?: string;
}

export function CompactFileDropzone({
  onDrop,
  accept = { 'text/markdown': ['.md'] },
  label = 'Drop file or click',
  className = '',
}: CompactFileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onDrop(acceptedFiles);
      }
    },
    accept,
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer transition-all
        ${isDragActive ? 'border-terminal-orange bg-terminal-orange/10' : 'border-terminal-border hover:border-terminal-orange'}
        ${className}
      `}
    >
      <input {...getInputProps()} />
      <Upload className={`h-4 w-4 ${isDragActive ? 'text-terminal-orange' : 'text-gray-500'}`} />
      <span className={`text-sm ${isDragActive ? 'text-terminal-orange' : 'text-gray-400'}`}>
        {isDragActive ? 'Drop here' : label}
      </span>
    </div>
  );
}

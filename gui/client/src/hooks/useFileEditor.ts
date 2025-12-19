/**
 * useFileEditor Hook
 *
 * Manages file loading, saving, auto-save, and unsaved state tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FileData {
  content: string;
  path: string;
  modified: string;
  etag: string;
}

interface UseFileEditorOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  onConflict?: (serverETag: string) => void;
}

interface UseFileEditorReturn {
  // State
  content: string;
  originalContent: string;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: Error | null;
  lastSaved: Date | null;

  // Actions
  setContent: (content: string) => void;
  save: () => Promise<void>;
  reload: () => void;
  discardChanges: () => void;
}

async function fetchFile(path: string): Promise<FileData> {
  const res = await fetch(`/api/files/${encodeURIComponent(path)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to load file');
  }
  return res.json();
}

async function saveFile(
  path: string,
  content: string,
  etag: string | null
): Promise<FileData> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const res = await fetch(`/api/files/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.code === 'CONFLICT') {
      const conflictError = new Error('File has been modified externally');
      (conflictError as any).code = 'CONFLICT';
      (conflictError as any).currentETag = error.currentETag;
      throw conflictError;
    }
    throw new Error(error.message || 'Failed to save file');
  }

  return res.json();
}

export function useFileEditor(
  filePath: string | null,
  options: UseFileEditorOptions = {}
): UseFileEditorReturn {
  const {
    autoSave = true,
    autoSaveDelay = 2000,
    onSaveSuccess,
    onSaveError,
    onConflict,
  } = options;

  const queryClient = useQueryClient();
  const [content, setContentState] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [etag, setEtag] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch file content
  const {
    data: fileData,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['file', filePath],
    queryFn: () => (filePath ? fetchFile(filePath) : Promise.resolve(null)),
    enabled: !!filePath,
    staleTime: 0, // Always fetch fresh
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!filePath) throw new Error('No file path');
      return saveFile(filePath, content, etag);
    },
    onSuccess: (data) => {
      setOriginalContent(content);
      setEtag(data.etag);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['file', filePath] });
      onSaveSuccess?.();
    },
    onError: (error: Error) => {
      if ((error as any).code === 'CONFLICT') {
        onConflict?.((error as any).currentETag);
      } else {
        onSaveError?.(error);
      }
    },
  });

  // Update content when file data loads
  useEffect(() => {
    if (fileData) {
      setContentState(fileData.content);
      setOriginalContent(fileData.content);
      setEtag(fileData.etag);
    }
  }, [fileData]);

  // Reset when file path changes
  useEffect(() => {
    setContentState('');
    setOriginalContent('');
    setEtag(null);
    setLastSaved(null);
  }, [filePath]);

  // Auto-save logic
  useEffect(() => {
    if (!autoSave) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if there are unsaved changes
    const hasChanges = content !== originalContent;
    if (!hasChanges || !filePath) return;

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, originalContent, autoSave, autoSaveDelay, filePath]);

  // Set content and mark as changed
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  // Manual save
  const save = useCallback(async () => {
    if (content === originalContent) return;
    await saveMutation.mutateAsync();
  }, [content, originalContent, saveMutation]);

  // Reload file from server
  const reload = useCallback(() => {
    refetch();
  }, [refetch]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setContentState(originalContent);
  }, [originalContent]);

  const hasUnsavedChanges = content !== originalContent;

  return {
    content,
    originalContent,
    isLoading,
    isSaving: saveMutation.isPending,
    hasUnsavedChanges,
    error: fetchError as Error | null,
    lastSaved,
    setContent,
    save,
    reload,
    discardChanges,
  };
}

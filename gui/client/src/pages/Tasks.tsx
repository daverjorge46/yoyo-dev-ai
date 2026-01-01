import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  RotateCcw,
  CheckCheck,
  Keyboard,
  Terminal,
  X,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  subtasks?: string[];
}

interface TaskGroup {
  id: string;
  title: string;
  tasks: Task[];
  completed: boolean;
}

interface ParsedTasks {
  specId: string;
  specName: string;
  groups: TaskGroup[];
  totalTasks: number;
  completedTasks: number;
}

interface TasksResponse {
  specs: ParsedTasks[];
  summary: {
    totalSpecs: number;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchTasks(): Promise<TasksResponse> {
  const res = await fetch('/api/tasks');
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

async function updateTask(
  specId: string,
  groupId: string,
  taskId: string,
  updates: { status?: 'pending' | 'completed'; title?: string }
) {
  const res = await fetch(`/api/tasks/${specId}/${groupId}/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

async function bulkUpdateGroup(
  specId: string,
  groupId: string,
  action: 'complete_all' | 'reset_all'
) {
  const res = await fetch(`/api/tasks/${specId}/${groupId}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to bulk update group');
  return res.json();
}

async function bulkUpdateSpec(
  specId: string,
  action: 'complete_all' | 'reset_all'
) {
  const res = await fetch(`/api/tasks/${specId}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to bulk update spec');
  return res.json();
}

// =============================================================================
// TaskInlineEditor Component
// =============================================================================

function TaskInlineEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editValue.trim() && editValue !== value) {
        onSave(editValue.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (editValue.trim() && editValue !== value) {
          onSave(editValue.trim());
        } else {
          onCancel();
        }
      }}
      className="flex-1 px-2 py-1 text-sm terminal-input"
    />
  );
}

// =============================================================================
// TaskItem Component
// =============================================================================

function TaskItem({
  task,
  specId,
  groupId,
  isSelected,
  onSelect,
}: {
  task: Task;
  specId: string;
  groupId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Listen for keyboard edit trigger
  useEffect(() => {
    const handleEditEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ specId: string; taskId: string }>;
      if (customEvent.detail.specId === specId && customEvent.detail.taskId === task.id) {
        setIsEditing(true);
      }
    };
    window.addEventListener('task-edit', handleEditEvent);
    return () => window.removeEventListener('task-edit', handleEditEvent);
  }, [specId, task.id]);

  const statusMutation = useMutation({
    mutationFn: (newStatus: 'pending' | 'completed') =>
      updateTask(specId, groupId, task.id.split('.')[1], { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const titleMutation = useMutation({
    mutationFn: (newTitle: string) =>
      updateTask(specId, groupId, task.id.split('.')[1], { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsEditing(false);
    },
  });

  const handleToggle = () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    statusMutation.mutate(newStatus);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSaveTitle = (newTitle: string) => {
    titleMutation.mutate(newTitle);
  };

  const isPending = statusMutation.isPending || titleMutation.isPending;

  const getStatusIcon = () => {
    if (task.status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-terminal-green" />;
    }
    if (task.status === 'in_progress') {
      return <Clock className="h-4 w-4 text-terminal-blue animate-pulse" />;
    }
    return <Circle className="h-4 w-4 text-gray-400 dark:text-terminal-text-muted" />;
  };

  return (
    <div
      className={`
        flex items-start gap-3 py-2 px-3 rounded transition-all duration-100
        ${isSelected ? 'bg-brand/5 dark:bg-terminal-orange/10 ring-1 ring-brand/30 dark:ring-terminal-orange/30' : 'hover:bg-gray-50 dark:hover:bg-terminal-elevated'}
      `}
      onClick={onSelect}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        disabled={isPending}
        className={`
          mt-0.5 p-0.5 rounded transition-all
          ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-terminal-surface'}
        `}
        aria-label={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
      >
        {getStatusIcon()}
      </button>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <TaskInlineEditor
            value={task.title}
            onSave={handleSaveTitle}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            className={`
              text-sm cursor-text select-none block
              ${task.status === 'completed'
                ? 'text-gray-400 dark:text-terminal-text-muted line-through'
                : 'text-gray-900 dark:text-terminal-text'
              }
            `}
            title="Double-click to edit"
          >
            {task.title}
          </span>
        )}
        {task.subtasks && task.subtasks.length > 0 && (
          <ul className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200 dark:border-terminal-border">
            {task.subtasks.map((subtask, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-500 dark:text-terminal-text-muted py-0.5"
              >
                {subtask}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TaskGroupCard Component - Terminal Style
// =============================================================================

function TaskGroupCard({
  group,
  specId,
  expanded,
  onToggleExpand,
  selectedTaskId,
  onSelectTask,
}: {
  group: TaskGroup;
  specId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: (action: 'complete_all' | 'reset_all') =>
      bulkUpdateGroup(specId, group.id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const completedCount = group.tasks.filter((t) => t.status === 'completed').length;
  const progress = Math.round((completedCount / group.tasks.length) * 100);

  return (
    <div className="terminal-card overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="
          w-full flex items-center justify-between p-3
          bg-gray-50 dark:bg-terminal-elevated
          hover:bg-gray-100 dark:hover:bg-terminal-surface
          transition-colors text-left
        "
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-brand dark:text-terminal-orange flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-terminal-text-muted flex-shrink-0" />
          )}
          <span className="text-xs font-mono text-gray-500 dark:text-terminal-text-muted flex-shrink-0">
            {group.id}.
          </span>
          <span className="font-medium text-gray-900 dark:text-terminal-text truncate">
            {group.title}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {/* Quick actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                bulkMutation.mutate('complete_all');
              }}
              disabled={bulkMutation.isPending || progress === 100}
              className="p-1 text-gray-400 hover:text-terminal-green disabled:opacity-30 transition-colors"
              title="Complete all"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                bulkMutation.mutate('reset_all');
              }}
              disabled={bulkMutation.isPending || progress === 0}
              className="p-1 text-gray-400 hover:text-terminal-orange disabled:opacity-30 transition-colors"
              title="Reset all"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          {/* Progress */}
          <span className="text-xs font-mono text-gray-500 dark:text-terminal-text-muted">
            {completedCount}/{group.tasks.length}
          </span>
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-terminal-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress === 100 ? 'bg-terminal-green' : 'bg-terminal-blue'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-2 space-y-1 bg-white dark:bg-terminal-card">
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              specId={specId}
              groupId={group.id}
              isSelected={selectedTaskId === task.id}
              onSelect={() => onSelectTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SpecTasksSection Component
// =============================================================================

function SpecTasksSection({
  spec,
  expandedGroups,
  onToggleGroup,
  onExpandAllGroups,
  onCollapseAllGroups,
  selectedTaskId,
  onSelectTask,
}: {
  spec: ParsedTasks;
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onExpandAllGroups: () => void;
  onCollapseAllGroups: () => void;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: (action: 'complete_all' | 'reset_all') =>
      bulkUpdateSpec(spec.specId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const progress = Math.round((spec.completedTasks / spec.totalTasks) * 100);

  return (
    <div className="terminal-card overflow-hidden">
      {/* Spec Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-terminal-elevated border-b border-gray-200 dark:border-terminal-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-brand dark:text-terminal-orange" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400 dark:text-terminal-text-muted" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-terminal-text">
              {spec.specName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-terminal-text-muted font-mono">
              {spec.specId}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-4">
          {/* Bulk actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkMutation.mutate('complete_all')}
              disabled={bulkMutation.isPending || progress === 100}
              className="terminal-btn-ghost text-xs gap-1 px-2 py-1 disabled:opacity-30"
              title="Complete all tasks"
            >
              <CheckCheck className="h-3 w-3" />
              <span className="hidden sm:inline">Complete All</span>
            </button>
            <button
              onClick={() => bulkMutation.mutate('reset_all')}
              disabled={bulkMutation.isPending || progress === 0}
              className="terminal-btn-ghost text-xs gap-1 px-2 py-1 disabled:opacity-30"
              title="Reset all tasks"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-terminal-border mx-1" />
            <button
              onClick={onExpandAllGroups}
              className="terminal-btn-ghost text-xs px-2 py-1"
              title="Expand all groups"
            >
              Expand
            </button>
            <button
              onClick={onCollapseAllGroups}
              className="terminal-btn-ghost text-xs px-2 py-1"
              title="Collapse all groups"
            >
              Collapse
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900 dark:text-terminal-text">
              {progress}%
            </span>
            <div className="w-24 h-2 bg-gray-200 dark:bg-terminal-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress === 100 ? 'bg-terminal-green' : 'bg-brand dark:bg-terminal-orange'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Groups */}
      {expanded && (
        <div className="p-4 space-y-3 bg-white dark:bg-terminal-card">
          {spec.groups.map((group) => (
            <TaskGroupCard
              key={group.id}
              group={group}
              specId={spec.specId}
              expanded={expandedGroups.has(group.id)}
              onToggleExpand={() => onToggleGroup(group.id)}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// KeyboardShortcutsHelp Component
// =============================================================================

function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="terminal-card shadow-xl p-6 max-w-md w-full mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-brand dark:text-terminal-orange" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-terminal-text">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="terminal-btn-ghost p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-terminal-text-muted uppercase tracking-wide mb-2">
              Navigation
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">j / k</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Move down / up</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">Space</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Toggle task</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">e</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Edit task</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-terminal-border pt-4">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-terminal-text-muted uppercase tracking-wide mb-2">
              Bulk Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">Shift+C</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Complete all</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">Shift+R</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Reset all</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">Shift+E</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Expand all</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">Shift+L</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Collapse all</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-terminal-border pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">?</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Show help</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="terminal-code px-2 py-0.5">Esc</kbd>
                <span className="text-gray-700 dark:text-terminal-text-secondary">Close / Cancel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tasks Page Component
// =============================================================================

export default function Tasks() {
  const queryClient = useQueryClient();
  const [expandedGroups, setExpandedGroups] = useState<Map<string, Set<string>>>(new Map());
  const [selectedTask, setSelectedTask] = useState<{ specId: string; taskId: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 3000,
  });

  const specs = data?.specs ?? [];
  const summary = data?.summary;

  // Initialize expanded groups for all specs
  useEffect(() => {
    if (specs.length > 0 && expandedGroups.size === 0) {
      const initial = new Map<string, Set<string>>();
      specs.forEach((spec) => {
        const groupSet = new Set<string>();
        spec.groups.forEach((group) => {
          if (!group.completed) {
            groupSet.add(group.id);
          }
        });
        initial.set(spec.specId, groupSet);
      });
      setExpandedGroups(initial);
    }
  }, [specs, expandedGroups.size]);

  // Get all tasks flattened for keyboard navigation
  const getAllTasks = useCallback(() => {
    const tasks: { specId: string; groupId: string; taskId: string }[] = [];
    specs.forEach((spec) => {
      spec.groups.forEach((group) => {
        group.tasks.forEach((task) => {
          tasks.push({ specId: spec.specId, groupId: group.id, taskId: task.id });
        });
      });
    });
    return tasks;
  }, [specs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const allTasks = getAllTasks();
      const currentIndex = selectedTask
        ? allTasks.findIndex((t) => t.specId === selectedTask.specId && t.taskId === selectedTask.taskId)
        : -1;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowHelp(true);
          break;
        case 'Escape':
          setShowHelp(false);
          setSelectedTask(null);
          break;
        case 'j':
          e.preventDefault();
          if (allTasks.length > 0) {
            const nextIndex = currentIndex < allTasks.length - 1 ? currentIndex + 1 : 0;
            setSelectedTask({ specId: allTasks[nextIndex].specId, taskId: allTasks[nextIndex].taskId });
          }
          break;
        case 'k':
          e.preventDefault();
          if (allTasks.length > 0) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : allTasks.length - 1;
            setSelectedTask({ specId: allTasks[prevIndex].specId, taskId: allTasks[prevIndex].taskId });
          }
          break;
        case ' ':
        case 'Enter':
          if (selectedTask && currentIndex >= 0) {
            e.preventDefault();
            const task = allTasks[currentIndex];
            const spec = specs.find((s) => s.specId === task.specId);
            const group = spec?.groups.find((g) => g.id === task.groupId);
            const taskObj = group?.tasks.find((t) => t.id === task.taskId);
            if (taskObj) {
              const newStatus = taskObj.status === 'completed' ? 'pending' : 'completed';
              updateTask(task.specId, task.groupId, task.taskId.split('.')[1], { status: newStatus })
                .then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }));
            }
          }
          break;
        case 'C':
          if (e.shiftKey && specs.length > 0) {
            e.preventDefault();
            bulkUpdateSpec(specs[0].specId, 'complete_all')
              .then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }));
          }
          break;
        case 'R':
          if (e.shiftKey && specs.length > 0) {
            e.preventDefault();
            bulkUpdateSpec(specs[0].specId, 'reset_all')
              .then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }));
          }
          break;
        case 'E':
          if (e.shiftKey) {
            e.preventDefault();
            specs.forEach((spec) => {
              const groupSet = new Set(spec.groups.map((g) => g.id));
              setExpandedGroups((prev) => new Map(prev).set(spec.specId, groupSet));
            });
          }
          break;
        case 'L':
          if (e.shiftKey) {
            e.preventDefault();
            specs.forEach((spec) => {
              setExpandedGroups((prev) => new Map(prev).set(spec.specId, new Set()));
            });
          }
          break;
        case 'e':
          if (selectedTask && currentIndex >= 0) {
            e.preventDefault();
            const editEvent = new CustomEvent('task-edit', { detail: selectedTask });
            window.dispatchEvent(editEvent);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getAllTasks, selectedTask, specs, queryClient]);

  const handleToggleGroup = (specId: string, groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Map(prev);
      const specGroups = next.get(specId) || new Set();
      const newSpecGroups = new Set(specGroups);
      if (newSpecGroups.has(groupId)) {
        newSpecGroups.delete(groupId);
      } else {
        newSpecGroups.add(groupId);
      }
      next.set(specId, newSpecGroups);
      return next;
    });
  };

  const handleExpandAllGroups = (specId: string) => {
    const spec = specs.find((s) => s.specId === specId);
    if (spec) {
      const groupSet = new Set(spec.groups.map((g) => g.id));
      setExpandedGroups((prev) => new Map(prev).set(specId, groupSet));
    }
  };

  const handleCollapseAllGroups = (specId: string) => {
    setExpandedGroups((prev) => new Map(prev).set(specId, new Set()));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="terminal-card p-8 text-center">
          <Terminal className="h-8 w-8 text-brand dark:text-terminal-orange mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500 dark:text-terminal-text-muted">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-terminal-text flex items-center gap-2">
              <Terminal className="h-6 w-6 text-brand dark:text-terminal-orange" />
              Tasks
            </h1>
            <Link
              to="/tasks/kanban"
              className="terminal-btn-secondary text-sm gap-1.5"
              title="View as Kanban Board"
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-terminal-text-muted">
            Track and manage development tasks
            <button
              onClick={() => setShowHelp(true)}
              className="ml-2 terminal-link text-xs"
            >
              (? for shortcuts)
            </button>
          </p>
        </div>

        {summary && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-terminal-text">
                {summary.progress}%
              </div>
              <div className="text-xs text-gray-500 dark:text-terminal-text-muted">
                {summary.completedTasks} / {summary.totalTasks} complete
              </div>
            </div>
            <div className="w-24 h-2 bg-gray-200 dark:bg-terminal-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.progress === 100 ? 'bg-terminal-green' : 'bg-brand dark:bg-terminal-orange'
                }`}
                style={{ width: `${summary.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {specs.length === 0 ? (
        <div className="terminal-card p-8 text-center">
          <Terminal className="h-10 w-10 text-gray-300 dark:text-terminal-text-muted mx-auto mb-3" />
          <p className="text-gray-500 dark:text-terminal-text-muted mb-2">
            No tasks found.
          </p>
          <p className="text-sm text-gray-400 dark:text-terminal-text-muted">
            Create a specification first using{' '}
            <code className="terminal-code">/create-new</code>
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {specs.map((spec) => (
            <SpecTasksSection
              key={spec.specId}
              spec={spec}
              expandedGroups={expandedGroups.get(spec.specId) || new Set()}
              onToggleGroup={(groupId) => handleToggleGroup(spec.specId, groupId)}
              onExpandAllGroups={() => handleExpandAllGroups(spec.specId)}
              onCollapseAllGroups={() => handleCollapseAllGroups(spec.specId)}
              selectedTaskId={selectedTask?.specId === spec.specId ? selectedTask.taskId : null}
              onSelectTask={(taskId) => setSelectedTask({ specId: spec.specId, taskId })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

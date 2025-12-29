import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';

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
      className="flex-1 px-2 py-0.5 text-sm border border-indigo-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

// =============================================================================
// TaskBulkActions Component
// =============================================================================

function TaskBulkActions({
  onCompleteAll,
  onResetAll,
  onExpandAll,
  onCollapseAll,
  isLoading,
}: {
  onCompleteAll: () => void;
  onResetAll: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Bulk:</span>
      <button
        onClick={onCompleteAll}
        disabled={isLoading}
        className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
        title="Mark all tasks complete (Shift+C)"
      >
        Complete All
      </button>
      <button
        onClick={onResetAll}
        disabled={isLoading}
        className="px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50"
        title="Reset all tasks to pending (Shift+R)"
      >
        Reset All
      </button>
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button
        onClick={onExpandAll}
        className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Expand all groups (Shift+E)"
      >
        Expand All
      </button>
      <button
        onClick={onCollapseAll}
        className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Collapse all groups (Shift+L)"
      >
        Collapse All
      </button>
    </div>
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

  return (
    <div
      className={`flex items-start gap-3 py-2 px-2 rounded transition-colors ${
        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
      }`}
      onClick={onSelect}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        disabled={isPending}
        className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          task.status === 'completed'
            ? 'bg-green-500 border-green-500 text-white'
            : task.status === 'in_progress'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        } ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        aria-label={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
      >
        {task.status === 'completed' && (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
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
            className={`text-sm cursor-text select-none ${
              task.status === 'completed'
                ? 'text-gray-500 dark:text-gray-400 line-through'
                : 'text-gray-900 dark:text-white'
            }`}
            title="Double-click to edit"
          >
            {task.title}
          </span>
        )}
        {task.subtasks && task.subtasks.length > 0 && (
          <ul className="mt-1 ml-4 space-y-0.5">
            {task.subtasks.map((subtask, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                * {subtask}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TaskGroupCard Component
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

  const completedCount = group.tasks.filter(
    (t) => t.status === 'completed'
  ).length;
  const progress = Math.round((completedCount / group.tasks.length) * 100);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium text-gray-900 dark:text-white">
            {group.id}. {group.title}
          </span>
        </button>
        <div className="flex items-center gap-3">
          {/* Group bulk actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => bulkMutation.mutate('complete_all')}
              disabled={bulkMutation.isPending || progress === 100}
              className="p-1 text-gray-400 hover:text-green-500 transition-colors disabled:opacity-30"
              title="Complete all in group"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => bulkMutation.mutate('reset_all')}
              disabled={bulkMutation.isPending || progress === 0}
              className="p-1 text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-30"
              title="Reset all in group"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {completedCount}/{group.tasks.length}
          </span>
          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="p-4 space-y-1 bg-white dark:bg-gray-800">
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

  const progress = Math.round(
    (spec.completedTasks / spec.totalTasks) * 100
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <svg
            className={`h-5 w-5 text-gray-500 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {spec.specName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {spec.specId}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <TaskBulkActions
            onCompleteAll={() => bulkMutation.mutate('complete_all')}
            onResetAll={() => bulkMutation.mutate('reset_all')}
            onExpandAll={onExpandAllGroups}
            onCollapseAll={onCollapseAllGroups}
            isLoading={bulkMutation.isPending}
          />
          <div className="text-right">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {progress}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              ({spec.completedTasks}/{spec.totalTasks})
            </span>
          </div>
          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3">
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500 dark:text-gray-400">Navigation</div>
            <div></div>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">j / k</kbd>
            <span className="text-gray-700 dark:text-gray-300">Move down / up</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space / Enter</kbd>
            <span className="text-gray-700 dark:text-gray-300">Toggle task</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">e</kbd>
            <span className="text-gray-700 dark:text-gray-300">Edit task title</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500 dark:text-gray-400">Bulk Actions</div>
            <div></div>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Shift + C</kbd>
            <span className="text-gray-700 dark:text-gray-300">Complete all</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Shift + R</kbd>
            <span className="text-gray-700 dark:text-gray-300">Reset all</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Shift + E</kbd>
            <span className="text-gray-700 dark:text-gray-300">Expand all groups</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Shift + L</kbd>
            <span className="text-gray-700 dark:text-gray-300">Collapse all groups</span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd>
            <span className="text-gray-700 dark:text-gray-300">Show this help</span>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
            <span className="text-gray-700 dark:text-gray-300">Close dialog / Cancel edit</span>
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
      // Don't handle shortcuts when typing in inputs
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
            // Trigger edit mode by dispatching a custom event
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tasks
            </h1>
            <Link
              to="/tasks/kanban"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              title="View as Kanban Board"
            >
              <LayoutGrid className="h-4 w-4" />
              Board View
            </Link>
          </div>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track and manage your development tasks
            <button
              onClick={() => setShowHelp(true)}
              className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
            >
              (? for shortcuts)
            </button>
          </p>
        </div>
        {summary && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.progress}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {summary.completedTasks} / {summary.totalTasks} complete
            </div>
          </div>
        )}
      </div>

      {specs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No tasks found. Create a specification first using{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              /create-new
            </code>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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

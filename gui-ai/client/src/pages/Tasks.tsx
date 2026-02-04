import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play,
  Pause,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Plus,
  X,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ProgressBar } from '../components/common/ProgressBar';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoader } from '../components/common/LoadingSpinner';
import type { Task } from '../types';

const COLUMNS = [
  { id: 'queued', title: 'Queued', icon: Clock, color: 'text-terminal-text-secondary' },
  { id: 'running', title: 'Running', icon: Play, color: 'text-primary-400' },
  { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-success' },
  { id: 'failed', title: 'Failed', icon: AlertCircle, color: 'text-error' },
] as const;

type ColumnId = (typeof COLUMNS)[number]['id'];

const TASK_TYPES = [
  { value: 'manual', label: 'Manual', description: 'One-time task you create' },
  { value: 'scheduled', label: 'Scheduled', description: 'Runs at a specific time' },
  { value: 'triggered', label: 'Triggered', description: 'Runs when an event occurs' },
] as const;

// Add task modal component
function AddTaskModal({
  onClose,
  onAdd,
  isLoading,
}: {
  onClose: () => void;
  onAdd: (task: { name: string; description?: string; type: string; scheduledAt?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('manual');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      scheduledAt: scheduledAt || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <h3 className="font-semibold text-terminal-text">Create New Task</h3>
            <button onClick={onClose} className="p-1 hover:bg-terminal-elevated rounded">
              <X className="w-5 h-5 text-terminal-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium text-terminal-text mb-1">
                Task Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter task name..."
                className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text placeholder:text-terminal-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-terminal-text mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text placeholder:text-terminal-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-sm font-medium text-terminal-text mb-2">
                Task Type
              </label>
              <div className="space-y-2">
                {TASK_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border transition-colors ${
                      type === t.value
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-terminal-border hover:bg-terminal-elevated'
                    }`}
                  >
                    <input
                      type="radio"
                      name="taskType"
                      value={t.value}
                      checked={type === t.value}
                      onChange={(e) => setType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-terminal-text">{t.label}</p>
                      <p className="text-xs text-terminal-text-secondary">{t.description}</p>
                    </div>
                    {type === t.value && (
                      <CheckCircle2 className="w-5 h-5 text-primary-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Scheduled At (only for scheduled type) */}
            {type === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium text-terminal-text mb-1">
                  Schedule Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded-md text-terminal-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim()}
                loading={isLoading}
                className="flex-1"
              >
                Create Task
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Task card component
function TaskCard({
  task,
  isDragging,
  onPause,
  onResume,
  onCancel,
}: {
  task: Task;
  isDragging?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}) {
  const typeColors = {
    manual: 'muted',
    scheduled: 'accent',
    triggered: 'info',
    suggested: 'primary',
  } as const;

  return (
    <Card
      variant={isDragging ? 'accent' : 'hover'}
      className={`p-3 ${isDragging ? 'shadow-glow-primary opacity-90' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-terminal-text truncate">{task.name}</h4>
          {task.description && (
            <p className="text-xs text-terminal-text-secondary truncate mt-0.5">
              {task.description}
            </p>
          )}
        </div>
        <button className="p-1 hover:bg-terminal-elevated rounded">
          <MoreVertical className="w-4 h-4 text-terminal-text-muted" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge variant={typeColors[task.type]}>{task.type}</Badge>
        {task.scheduledAt && (
          <span className="text-xs text-terminal-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(task.scheduledAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {task.status === 'running' && (
        <ProgressBar value={task.progress} className="mb-2" />
      )}

      {task.error && (
        <p className="text-xs text-error-light mb-2 truncate">{task.error}</p>
      )}

      <div className="flex items-center gap-1 mt-2">
        {task.status === 'running' && onPause && (
          <Button size="sm" variant="ghost" onClick={onPause} icon={<Pause className="w-3 h-3" />}>
            Pause
          </Button>
        )}
        {task.status === 'paused' && onResume && (
          <Button size="sm" variant="ghost" onClick={onResume} icon={<Play className="w-3 h-3" />}>
            Resume
          </Button>
        )}
        {(task.status === 'queued' || task.status === 'running' || task.status === 'paused') &&
          onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              icon={<XCircle className="w-3 h-3" />}
            >
              Cancel
            </Button>
          )}
      </div>
    </Card>
  );
}

// Sortable task card
function SortableTaskCard({
  task,
  onPause,
  onResume,
  onCancel,
}: {
  task: Task;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
      />
    </div>
  );
}

// Column component
function Column({
  column,
  tasks,
  onPauseTask,
  onResumeTask,
  onCancelTask,
}: {
  column: (typeof COLUMNS)[number];
  tasks: Task[];
  onPauseTask: (id: string) => void;
  onResumeTask: (id: string) => void;
  onCancelTask: (id: string) => void;
}) {
  const Icon = column.icon;

  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className={`w-4 h-4 ${column.color}`} />
        <h3 className="text-sm font-semibold text-terminal-text">{column.title}</h3>
        <Badge variant="muted">{tasks.length}</Badge>
      </div>

      <div className="space-y-2 min-h-[200px] p-2 bg-terminal-bg/50 rounded-lg border border-terminal-border/50">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onPause={task.status === 'running' ? () => onPauseTask(task.id) : undefined}
              onResume={task.status === 'paused' ? () => onResumeTask(task.id) : undefined}
              onCancel={
                ['queued', 'running', 'paused'].includes(task.status)
                  ? () => onCancelTask(task.id)
                  : undefined
              }
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-[100px] text-terminal-text-muted text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return data.tasks || [];
    },
  });

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async (task: { name: string; description?: string; type: string; scheduledAt?: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowAddModal(false);
    },
  });

  // Update task status mutation
  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as ColumnId;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateTask.mutate({ id: taskId, status: newStatus });
    }
  };

  const handlePauseTask = (id: string) => {
    updateTask.mutate({ id, status: 'paused' });
  };

  const handleResumeTask = (id: string) => {
    updateTask.mutate({ id, status: 'running' });
  };

  const handleCancelTask = (id: string) => {
    updateTask.mutate({ id, status: 'failed' });
  };

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.id] = tasks.filter((t) => t.status === column.id);
    return acc;
  }, {} as Record<ColumnId, Task[]>);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="panel-header">
        <h1 className="panel-title">Tasks</h1>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddModal(true)}>
          New Task
        </Button>
      </div>

      {/* Task board */}
      <div className="flex-1 overflow-auto p-6">
        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No tasks yet"
            description="Create a task manually or let automations create them for you."
            action={{ label: 'Create Task', onClick: () => setShowAddModal(true) }}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-w-max">
              {COLUMNS.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  tasks={tasksByStatus[column.id]}
                  onPauseTask={handlePauseTask}
                  onResumeTask={handleResumeTask}
                  onCancelTask={handleCancelTask}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add task modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddTaskModal
            onClose={() => setShowAddModal(false)}
            onAdd={(task) => createTask.mutate(task)}
            isLoading={createTask.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

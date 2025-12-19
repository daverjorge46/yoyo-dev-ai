import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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

async function fetchTasks(): Promise<TasksResponse> {
  const res = await fetch('/api/tasks');
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

async function updateTaskStatus(
  specId: string,
  groupId: string,
  taskId: string,
  status: 'pending' | 'completed'
) {
  const res = await fetch(`/api/tasks/${specId}/${groupId}/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

function TaskItem({
  task,
  specId,
  groupId,
}: {
  task: Task;
  specId: string;
  groupId: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newStatus: 'pending' | 'completed') =>
      updateTaskStatus(specId, groupId, task.id.split('.')[1], newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleToggle = () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    mutation.mutate(newStatus);
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <button
        onClick={handleToggle}
        disabled={mutation.isPending}
        className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          task.status === 'completed'
            ? 'bg-green-500 border-green-500 text-white'
            : task.status === 'in_progress'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        } ${mutation.isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
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
      <div className="flex-1">
        <span
          className={`text-sm ${
            task.status === 'completed'
              ? 'text-gray-500 dark:text-gray-400 line-through'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {task.title}
        </span>
        {task.subtasks && task.subtasks.length > 0 && (
          <ul className="mt-1 ml-4 space-y-0.5">
            {task.subtasks.map((subtask, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                • {subtask}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TaskGroupCard({
  group,
  specId,
}: {
  group: TaskGroup;
  specId: string;
}) {
  const [expanded, setExpanded] = useState(!group.completed);

  const completedCount = group.tasks.filter(
    (t) => t.status === 'completed'
  ).length;
  const progress = Math.round((completedCount / group.tasks.length) * 100);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-3">
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
      </button>
      {expanded && (
        <div className="p-4 space-y-1 bg-white dark:bg-gray-800">
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              specId={specId}
              groupId={group.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecTasksSection({ spec }: { spec: ParsedTasks }) {
  const [expanded, setExpanded] = useState(true);
  const progress = Math.round(
    (spec.completedTasks / spec.totalTasks) * 100
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-4">
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
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {spec.groups.map((group) => (
            <TaskGroupCard key={group.id} group={group} specId={spec.specId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 3000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const specs = data?.specs ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tasks
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Track and manage your development tasks
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
            <SpecTasksSection key={spec.specId} spec={spec} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * useDataLoader Hook
 *
 * Loads all data on TUI mount and updates the Zustand store.
 * Calls all services to fetch specs, tasks, git, MCP, and memory status.
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '../backend/state-manager.js';
import { specService } from '../backend/services/SpecService.js';
import { taskService } from '../backend/services/TaskService.js';
import { gitService } from '../backend/services/GitService.js';
import { mcpService } from '../backend/services/McpService.js';
import { memoryService } from '../backend/services/MemoryService.js';
import { projectService } from '../backend/services/ProjectService.js';

export interface DataLoaderState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

/**
 * Hook to load all data on mount and populate the store
 */
export function useDataLoader(): DataLoaderState {
  const [state, setState] = useState<DataLoaderState>({
    isLoading: true,
    isLoaded: false,
    error: null,
  });

  // Get store setters
  const setTasks = useAppStore((s) => s.setTasks);
  const setSpecs = useAppStore((s) => s.setSpecs);
  const setActiveSpec = useAppStore((s) => s.setActiveSpec);
  const setGitStatus = useAppStore((s) => s.setGitStatus);
  const setMcpStatus = useAppStore((s) => s.setMcpStatus);
  const setMemoryStatus = useAppStore((s) => s.setMemoryStatus);
  const setProjectInfo = useAppStore((s) => s.setProjectInfo);

  useEffect(() => {
    let isMounted = true;

    async function loadAllData() {
      try {
        // Load all data in parallel
        const [specs, tasks, gitStatus, mcpStatus, memoryStatus, projectInfo] = await Promise.all([
          specService.getAllSpecs(),
          taskService.getTasks(),
          gitService.getStatus(),
          mcpService.getStatus(),
          memoryService.getStatus(),
          projectService.getProjectInfo(),
        ]);

        // Only update if still mounted
        if (!isMounted) return;

        // Update store with loaded data
        setSpecs(specs);
        setTasks(tasks);
        setGitStatus(gitStatus);
        setMcpStatus(mcpStatus);
        setMemoryStatus(memoryStatus);
        setProjectInfo(projectInfo);

        // Set active spec (most recent incomplete)
        const activeSpec = await specService.getActiveSpec();
        if (activeSpec && isMounted) {
          setActiveSpec(activeSpec);
        }

        setState({
          isLoading: false,
          isLoaded: true,
          error: null,
        });
      } catch (error) {
        if (!isMounted) return;

        setState({
          isLoading: false,
          isLoaded: false,
          error: error instanceof Error ? error.message : 'Failed to load data',
        });
      }
    }

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, [setTasks, setSpecs, setActiveSpec, setGitStatus, setMcpStatus, setMemoryStatus, setProjectInfo]);

  return state;
}

/**
 * Hook to manually trigger a data refresh
 */
export function useDataRefresh() {
  const setTasks = useAppStore((s) => s.setTasks);
  const setSpecs = useAppStore((s) => s.setSpecs);
  const setActiveSpec = useAppStore((s) => s.setActiveSpec);
  const setGitStatus = useAppStore((s) => s.setGitStatus);
  const setMcpStatus = useAppStore((s) => s.setMcpStatus);
  const setMemoryStatus = useAppStore((s) => s.setMemoryStatus);
  const setProjectInfo = useAppStore((s) => s.setProjectInfo);

  async function refresh() {
    const [specs, tasks, gitStatus, mcpStatus, memoryStatus, projectInfo] = await Promise.all([
      specService.getAllSpecs(),
      taskService.getTasks(),
      gitService.getStatus(),
      mcpService.getStatus(),
      memoryService.getStatus(),
      projectService.getProjectInfo(),
    ]);

    setSpecs(specs);
    setTasks(tasks);
    setGitStatus(gitStatus);
    setMcpStatus(mcpStatus);
    setMemoryStatus(memoryStatus);
    setProjectInfo(projectInfo);

    const activeSpec = await specService.getActiveSpec();
    if (activeSpec) {
      setActiveSpec(activeSpec);
    }
  }

  return refresh;
}

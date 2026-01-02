import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { Task, TaskInput, DerivedTask, Metrics } from '@/types';
import {
  withDerived,
  sortTasks,
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
} from '@/utils/logic';

interface TasksContextValue {
  tasks: Task[];
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  loading: boolean;
  error: string | null;
  lastDeleted: Task | null;
  addTask: (task: TaskInput) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  clearLastDeleted: () => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);

  const addTask = useCallback((input: TaskInput) => {
    const now = new Date().toISOString();
    setTasks(prev => [
      ...prev,
      {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        createdAt: now,
        completedAt: input.status === 'Done' ? now : undefined,
      },
    ]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              ...patch,
              completedAt:
                t.status !== 'Done' && patch.status === 'Done'
                  ? new Date().toISOString()
                  : t.completedAt,
            }
          : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const found = prev.find(t => t.id === id) ?? null;
      setLastDeleted(found);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
    if (lastDeleted) {
      setTasks(prev => [...prev, lastDeleted]);
      setLastDeleted(null);
    }
  }, [lastDeleted]);

  const clearLastDeleted = useCallback(() => {
    setLastDeleted(null);
  }, []);

  const derivedSorted = useMemo(
    () => sortTasks(tasks.map(withDerived)),
    [tasks],
  );

  const metrics = useMemo<Metrics>(() => ({
    totalRevenue: computeTotalRevenue(tasks),
    totalTimeTaken: tasks.reduce((s, t) => s + t.timeTaken, 0),
    timeEfficiencyPct: computeTimeEfficiency(tasks),
    revenuePerHour: computeRevenuePerHour(tasks),
    averageROI: computeAverageROI(tasks),
    performanceGrade: computePerformanceGrade(computeAverageROI(tasks)),
  }), [tasks]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        derivedSorted,
        metrics,
        loading: false,
        error: null,
        lastDeleted,
        addTask,
        updateTask,
        deleteTask,
        undoDelete,
        clearLastDeleted,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasksContext() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasksContext must be inside TasksProvider');
  return ctx;
}

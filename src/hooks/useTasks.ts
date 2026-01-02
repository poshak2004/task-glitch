import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Task, DerivedTask, TaskInput } from '@/types';
import { withDerived, sortTasks } from '@/utils/logic';
import { generateSalesTasks } from '@/utils/seed';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    try {
      setTasks(generateSalesTasks(30));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const derivedSorted = useMemo<DerivedTask[]>(
    () => sortTasks(tasks.map(withDerived)),
    [tasks],
  );

  const addTask = useCallback((input: TaskInput) => {
    setTasks(prev => [
      ...prev,
      {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        completedAt:
          input.status === 'Done' ? new Date().toISOString() : undefined,
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
                patch.status === 'Done' && !t.completedAt
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
    if (!lastDeleted) return;
    setTasks(prev => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  const clearLastDeleted = useCallback(() => {
    setLastDeleted(null);
  }, []);

  return {
    tasks,
    loading,
    error,
    derivedSorted,
    lastDeleted,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
    clearLastDeleted,
  };
}

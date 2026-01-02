import { DerivedTask, Task } from '@/types';

/* ================= ROI & SORTING ================= */

export function computeROI(revenue: number, timeTaken: number): number {
  if (!Number.isFinite(revenue) || !Number.isFinite(timeTaken) || timeTaken <= 0) {
    return 0;
  }
  return Number((revenue / timeTaken).toFixed(2));
}

export function computePriorityWeight(priority: Task['priority']): 1 | 2 | 3 {
  return priority === 'High' ? 3 : priority === 'Medium' ? 2 : 1;
}

export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}

export function sortTasks(tasks: ReadonlyArray<DerivedTask>): DerivedTask[] {
  return [...tasks].sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi;
    if (b.priorityWeight !== a.priorityWeight) {
      return b.priorityWeight - a.priorityWeight;
    }
    return (
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
    );
  });
}

/* ================= CORE METRICS ================= */

export function computeTotalRevenue(tasks: ReadonlyArray<Task>): number {
  return tasks
    .filter(t => t.status === 'Done')
    .reduce((s, t) => s + t.revenue, 0);
}

export function computeTotalTimeTaken(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((s, t) => s + t.timeTaken, 0);
}

export function computeTimeEfficiency(tasks: ReadonlyArray<Task>): number {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.status === 'Done').length;
  return (done / tasks.length) * 100;
}

export function computeRevenuePerHour(tasks: ReadonlyArray<Task>): number {
  const time = computeTotalTimeTaken(tasks);
  return time ? Number((computeTotalRevenue(tasks) / time).toFixed(2)) : 0;
}

export function computeAverageROI(tasks: ReadonlyArray<Task>): number {
  if (!tasks.length) return 0;
  return Number(
    (
      tasks.reduce(
        (s, t) => s + computeROI(t.revenue, t.timeTaken),
        0,
      ) / tasks.length
    ).toFixed(2),
  );
}

export function computePerformanceGrade(
  avgROI: number,
): 'Excellent' | 'Good' | 'Needs Improvement' {
  if (avgROI > 500) return 'Excellent';
  if (avgROI >= 200) return 'Good';
  return 'Needs Improvement';
}

/* ================= TIME HELPERS ================= */

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

/* ================= ANALYTICS (REQUIRED) ================= */

export type FunnelCounts = {
  todo: number;
  inProgress: number;
  done: number;
  conversionTodoToInProgress: number;
  conversionInProgressToDone: number;
};

export function computeFunnel(tasks: ReadonlyArray<Task>): FunnelCounts {
  const todo = tasks.filter(t => t.status === 'Todo').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const done = tasks.filter(t => t.status === 'Done').length;
  const total = todo + inProgress + done;

  return {
    todo,
    inProgress,
    done,
    conversionTodoToInProgress: total ? (inProgress + done) / total : 0,
    conversionInProgressToDone: inProgress ? done / inProgress : 0,
  };
}

export function computeVelocityByPriority(
  tasks: ReadonlyArray<Task>,
): Record<Task['priority'], { avgDays: number; medianDays: number }> {
  const groups: Record<Task['priority'], number[]> = {
    High: [],
    Medium: [],
    Low: [],
  };

  tasks.forEach(t => {
    if (t.completedAt) {
      groups[t.priority].push(
        daysBetween(t.createdAt, t.completedAt),
      );
    }
  });

  const result: Record<Task['priority'], { avgDays: number; medianDays: number }> =
    { High: { avgDays: 0, medianDays: 0 }, Medium: { avgDays: 0, medianDays: 0 }, Low: { avgDays: 0, medianDays: 0 } };

  (Object.keys(groups) as Task['priority'][]).forEach(p => {
    const arr = groups[p].sort((a, b) => a - b);
    result[p] = {
      avgDays: arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0,
      medianDays: arr.length ? arr[Math.floor(arr.length / 2)] : 0,
    };
  });

  return result;
}

export function computeThroughputByWeek(
  tasks: ReadonlyArray<Task>,
): Array<{ week: string; count: number; revenue: number }> {
  const map = new Map<string, { count: number; revenue: number }>();

  tasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const week = `${d.getUTCFullYear()}-W${getWeekNumber(d)}`;
    const v = map.get(week) ?? { count: 0, revenue: 0 };
    v.count += 1;
    v.revenue += t.revenue;
    map.set(week, v);
  });

  return Array.from(map.entries()).map(([week, v]) => ({ week, ...v }));
}

export function computeWeightedPipeline(tasks: ReadonlyArray<Task>): number {
  const weights = { Todo: 0.1, 'In Progress': 0.5, Done: 1 } as const;
  return tasks.reduce((s, t) => s + t.revenue * weights[t.status], 0);
}

export function computeForecast(
  weekly: Array<{ week: string; revenue: number }>,
  horizonWeeks = 4,
): Array<{ week: string; revenue: number }> {
  if (weekly.length < 2) return [];

  const y = weekly.map(w => w.revenue);
  const x = weekly.map((_, i) => i);
  const n = x.length;

  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumXX = x.reduce((s, v) => s + v * v, 0);

  const slope =
    (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: horizonWeeks }, (_, i) => ({
    week: `+${i + 1}`,
    revenue: Math.max(0, slope * (x.length + i) + intercept),
  }));
}

function getWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

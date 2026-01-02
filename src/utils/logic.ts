import { DerivedTask, Task } from '@/types';

/* ================= ROI & SORTING ================= */

export function computeROI(revenue: number, timeTaken: number): number {
  if (!Number.isFinite(revenue) || !Number.isFinite(timeTaken) || timeTaken <= 0) {
    return 0;
  }
  return Number((revenue / timeTaken).toFixed(2));
}

export function computePriorityWeight(
  p: Task['priority'],
): 1 | 2 | 3 {
  return p === 'High' ? 3 : p === 'Medium' ? 2 : 1;
}

export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}

export function sortTasks(
  tasks: ReadonlyArray<DerivedTask>,
): DerivedTask[] {
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

/* ================= METRICS ================= */

export function computeTotalRevenue(tasks: Task[]): number {
  return tasks
    .filter(t => t.status === 'Done')
    .reduce((s, t) => s + t.revenue, 0);
}

export function computeTimeEfficiency(tasks: Task[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.status === 'Done').length;
  return (done / tasks.length) * 100;
}

export function computeRevenuePerHour(tasks: Task[]): number {
  const time = tasks.reduce((s, t) => s + t.timeTaken, 0);
  return time
    ? Number((computeTotalRevenue(tasks) / time).toFixed(2))
    : 0;
}

export function computeAverageROI(tasks: Task[]): number {
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
  avg: number,
): 'Excellent' | 'Good' | 'Needs Improvement' {
  if (avg > 500) return 'Excellent';
  if (avg >= 200) return 'Good';
  return 'Needs Improvement';
}

/* ================= FUNNEL ================= */

export type FunnelCounts = {
  todo: number;
  inProgress: number;
  done: number;
  conversionTodoToInProgress: number;
  conversionInProgressToDone: number;
};

export function computeFunnel(tasks: Task[]): FunnelCounts {
  const todo = tasks.filter(t => t.status === 'Todo').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const done = tasks.filter(t => t.status === 'Done').length;

  const base = todo + inProgress + done;

  return {
    todo,
    inProgress,
    done,
    conversionTodoToInProgress: base
      ? (inProgress + done) / base
      : 0,
    conversionInProgressToDone: inProgress
      ? done / inProgress
      : 0,
  };
}

/* ================= TIME HELPERS ================= */

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

/* ================= ADVANCED ANALYTICS ================= */

export function computeVelocityByPriority(
  tasks: Task[],
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

  const result = {
    High: { avgDays: 0, medianDays: 0 },
    Medium: { avgDays: 0, medianDays: 0 },
    Low: { avgDays: 0, medianDays: 0 },
  };

  (Object.keys(groups) as Task['priority'][]).forEach(k => {
    const arr = groups[k].sort((a, b) => a - b);
    if (!arr.length) return;

    result[k] = {
      avgDays: arr.reduce((s, v) => s + v, 0) / arr.length,
      medianDays: arr[Math.floor(arr.length / 2)],
    };
  });

  return result;
}

export function computeThroughputByWeek(
  tasks: Task[],
): Array<{ week: string; count: number; revenue: number }> {
  const map = new Map<string, { count: number; revenue: number }>();

  tasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const week = `${d.getUTCFullYear()}-W${getWeekNumber(d)}`;

    const curr = map.get(week) ?? { count: 0, revenue: 0 };
    curr.count += 1;
    curr.revenue += t.revenue;
    map.set(week, curr);
  });

  return Array.from(map.entries()).map(([week, v]) => ({
    week,
    ...v,
  }));
}

export function computeWeightedPipeline(tasks: Task[]): number {
  const weights = { Todo: 0.1, 'In Progress': 0.5, Done: 1 } as const;
  return tasks.reduce(
    (s, t) => s + t.revenue * weights[t.status],
    0,
  );
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
    (n * sumXY - sumX * sumY) /
    (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  const lastIndex = x[x.length - 1];
  return Array.from({ length: horizonWeeks }).map((_, i) => ({
    week: `+${i + 1}`,
    revenue: Math.max(0, slope * (lastIndex + i + 1) + intercept),
  }));
}

/* ================= HELPERS ================= */

function getWeekNumber(d: Date): number {
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    )
  );
}

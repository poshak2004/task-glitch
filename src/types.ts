export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'Todo' | 'In Progress' | 'Done';

export interface Task {
  id: string;
  title: string;
  revenue: number;
  timeTaken: number;
  priority: Priority;
  status: Status;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'completedAt'> & {
  id?: string;
};

export interface DerivedTask extends Task {
  roi: number;
  priorityWeight: 1 | 2 | 3;
}

export interface Metrics {
  totalRevenue: number;
  totalTimeTaken: number;
  timeEfficiencyPct: number;
  revenuePerHour: number;
  averageROI: number;
  performanceGrade: 'Excellent' | 'Good' | 'Needs Improvement';
}

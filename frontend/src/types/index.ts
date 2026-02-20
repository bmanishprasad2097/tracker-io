export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  topic_id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  roadmap_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  tasks: Task[];
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapListItem {
  id: string;
  title: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_archived: boolean;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapDetail extends RoadmapListItem {
  topics: Topic[];
}

export interface TasksCompletedPerDay {
  date: string;
  count: number;
}

export interface DashboardStats {
  total_roadmaps: number;
  total_topics: number;
  total_tasks: number;
  completed_tasks: number;
  completion_percent: number;
  current_streak: number;
  tasks_completed_per_day: TasksCompletedPerDay[];
}

export interface RoadmapCreate {
  title: string;
  description?: string;
  color?: string;
}

export interface RoadmapUpdate {
  title?: string;
  description?: string;
  color?: string;
  is_archived?: boolean;
}

export interface TopicCreate {
  title: string;
  description?: string;
}

export interface TopicUpdate {
  title?: string;
  description?: string;
}

export interface TaskCreate {
  title: string;
  notes?: string;
}

export interface TaskUpdate {
  title?: string;
  notes?: string;
  status?: TaskStatus;
}

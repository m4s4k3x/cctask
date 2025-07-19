export type Priority = "high" | "medium" | "low";
export type TaskStatus = "active" | "completed" | "archived";

export interface GitInfo {
  repositoryName: string;
  branch: string;
  worktreePath: string;
  worktreeName: string;
  commitHash: string;
  remoteUrl: string;
}

export interface Task {
  id: string;
  name: string;
  priority: Priority;
  status: TaskStatus;
  description?: string;
  purpose?: string;
  successConditions: string[];
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  gitInfo: GitInfo;
}

export interface TaskTemplate {
  name: string;
  description: string;
  defaults: {
    priority: Priority;
    status: TaskStatus;
  };
  descriptionTemplate?: string;
  purposeTemplate?: string;
  successConditions: string[];
  todoItems: string[];
}

export interface TaskCreateOptions {
  name: string;
  priority?: Priority;
  description?: string;
  purpose?: string;
  successConditions?: string[];
  template?: string;
  interactive?: boolean;
  auto?: boolean;
}

export interface TaskDirectory {
  task: Task;
  path: string;
  repository: string;
  worktree: string;
  branch: string;
  status: TaskStatus;
}
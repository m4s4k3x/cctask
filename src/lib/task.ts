import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import { format } from "@std/datetime";
import { Task, TaskDirectory, TaskStatus } from "../types/task.ts";
import { getConfig } from "./config.ts";
import { getCurrentBranch } from "./git.ts";

const config = getConfig();

export async function findTaskDir(taskId: string): Promise<string | null> {
  // Search in new structure (repository/worktree/branch/status/task)
  for await (const repoEntry of Deno.readDir(config.cctaskRoot)) {
    if (!repoEntry.isDirectory) continue;
    
    const repoPath = join(config.cctaskRoot, repoEntry.name);
    
    for await (const worktreeEntry of Deno.readDir(repoPath)) {
      if (!worktreeEntry.isDirectory) continue;
      
      const worktreePath = join(repoPath, worktreeEntry.name);
      
      for await (const branchEntry of Deno.readDir(worktreePath)) {
        if (!branchEntry.isDirectory) continue;
        
        const branchPath = join(worktreePath, branchEntry.name);
        
        for (const status of ["active", "completed", "archived"]) {
          const taskPath = join(branchPath, status, taskId);
          if (await exists(taskPath)) {
            return taskPath;
          }
        }
      }
    }
  }
  
  // Search in old structure (repository/status/task)
  for await (const repoEntry of Deno.readDir(config.cctaskRoot)) {
    if (!repoEntry.isDirectory) continue;
    
    const repoPath = join(config.cctaskRoot, repoEntry.name);
    
    for (const status of ["active", "completed", "archived"]) {
      const taskPath = join(repoPath, status, taskId);
      if (await exists(taskPath)) {
        return taskPath;
      }
    }
  }
  
  return null;
}

export async function getCurrentTaskFile(branch?: string): Promise<string> {
  const currentBranch = branch || await getCurrentBranch();
  return join(config.cctaskRoot, `.current_task_${currentBranch}`);
}

export async function getCurrentTaskId(): Promise<string | null> {
  const branchTaskFile = await getCurrentTaskFile();
  
  try {
    if (await exists(branchTaskFile)) {
      return await Deno.readTextFile(branchTaskFile);
    }
    
    // Fallback to global file for backward compatibility
    if (await exists(config.currentTaskFile)) {
      return await Deno.readTextFile(config.currentTaskFile);
    }
  } catch {
    // Ignore errors
  }
  
  return null;
}

export async function setCurrentTaskId(taskId: string): Promise<void> {
  const branch = await getCurrentBranch();
  const branchTaskFile = await getCurrentTaskFile(branch);
  
  // Save to branch-specific file
  await Deno.writeTextFile(branchTaskFile, taskId);
  
  // Save to global file for backward compatibility
  await Deno.writeTextFile(config.currentTaskFile, taskId);
}

export async function createTaskDirectory(
  taskId: string,
  repositoryName: string,
  worktreeName: string,
  branch: string,
  status: TaskStatus = "active",
): Promise<string> {
  const taskDir = join(config.cctaskRoot, repositoryName, worktreeName, branch, status, taskId);
  
  await ensureDir(join(taskDir, "sessions"));
  await ensureDir(join(taskDir, "artifacts"));
  await ensureDir(join(taskDir, "notes"));
  
  return taskDir;
}

export async function listTasks(statusFilter?: TaskStatus | "all"): Promise<TaskDirectory[]> {
  const tasks: TaskDirectory[] = [];
  
  if (!await exists(config.cctaskRoot)) {
    return tasks;
  }
  
  // Helper to check if we should include this status
  const shouldIncludeStatus = (status: TaskStatus) => {
    return statusFilter === "all" || statusFilter === undefined || statusFilter === status;
  };
  
  // Search in new structure
  for await (const repoEntry of Deno.readDir(config.cctaskRoot)) {
    if (!repoEntry.isDirectory || repoEntry.name.startsWith(".")) continue;
    
    const repoPath = join(config.cctaskRoot, repoEntry.name);
    
    // Check if this is old structure (has status directories directly)
    const hasStatusDirs = await checkHasStatusDirs(repoPath);
    
    if (hasStatusDirs) {
      // Old structure: repository/status/task
      for (const status of ["active", "completed", "archived"] as TaskStatus[]) {
        if (!shouldIncludeStatus(status)) continue;
        
        const statusPath = join(repoPath, status);
        if (!await exists(statusPath)) continue;
        
        for await (const taskEntry of Deno.readDir(statusPath)) {
          if (!taskEntry.isDirectory) continue;
          
          const taskPath = join(statusPath, taskEntry.name);
          const taskFile = join(taskPath, "TASK.md");
          
          if (await exists(taskFile)) {
            tasks.push({
              task: {} as Task, // Will be loaded separately if needed
              path: taskPath,
              repository: repoEntry.name,
              worktree: "main",
              branch: "main",
              status,
            });
          }
        }
      }
    } else {
      // New structure: repository/worktree/branch/status/task
      for await (const worktreeEntry of Deno.readDir(repoPath)) {
        if (!worktreeEntry.isDirectory) continue;
        
        const worktreePath = join(repoPath, worktreeEntry.name);
        
        for await (const branchEntry of Deno.readDir(worktreePath)) {
          if (!branchEntry.isDirectory) continue;
          
          const branchPath = join(worktreePath, branchEntry.name);
          
          for (const status of ["active", "completed", "archived"] as TaskStatus[]) {
            if (!shouldIncludeStatus(status)) continue;
            
            const statusPath = join(branchPath, status);
            if (!await exists(statusPath)) continue;
            
            for await (const taskEntry of Deno.readDir(statusPath)) {
              if (!taskEntry.isDirectory) continue;
              
              const taskPath = join(statusPath, taskEntry.name);
              const taskFile = join(taskPath, "TASK.md");
              
              if (await exists(taskFile)) {
                tasks.push({
                  task: {} as Task, // Will be loaded separately if needed
                  path: taskPath,
                  repository: repoEntry.name,
                  worktree: worktreeEntry.name,
                  branch: branchEntry.name,
                  status,
                });
              }
            }
          }
        }
      }
    }
  }
  
  return tasks;
}

async function checkHasStatusDirs(repoPath: string): Promise<boolean> {
  for (const status of ["active", "completed", "archived"]) {
    if (await exists(join(repoPath, status))) {
      return true;
    }
  }
  return false;
}

export function generateTaskId(taskName: string): string {
  const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
  const safeName = taskName
    .replace(/\s+/g, "-")
    .replace(/[/<>:"|?*]/g, "");
  
  return `${timestamp}_${safeName}`;
}
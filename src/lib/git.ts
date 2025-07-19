import { GitInfo } from "../types/task.ts";
import { basename } from "@std/path";

export async function getGitInfo(): Promise<GitInfo> {
  // Check if in a git repository
  const checkGit = new Deno.Command("git", {
    args: ["rev-parse", "--git-dir"],
    stdout: "piped",
    stderr: "piped",
  });
  
  const checkResult = await checkGit.output();
  if (!checkResult.success) {
    throw new Error("Gitリポジトリではありません");
  }

  // Get repository name
  const remoteUrl = await getGitOutput(["remote", "get-url", "origin"]).catch(() => "なし");
  const repositoryName = remoteUrl !== "なし" 
    ? basename(remoteUrl).replace(/\.git$/, "")
    : basename(Deno.cwd());

  // Get branch name
  const branch = await getGitOutput(["branch", "--show-current"]);

  // Get worktree info
  const worktreePath = Deno.cwd();
  const worktreeList = await getGitOutput(["worktree", "list"]);
  const worktreeName = await getWorktreeName(worktreePath, worktreeList);

  // Get commit hash
  const commitHash = await getGitOutput(["rev-parse", "--short", "HEAD"]);

  return {
    repositoryName,
    branch,
    worktreePath,
    worktreeName,
    commitHash,
    remoteUrl,
  };
}

async function getGitOutput(args: string[]): Promise<string> {
  const cmd = new Deno.Command("git", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  
  const result = await cmd.output();
  if (!result.success) {
    const error = new TextDecoder().decode(result.stderr);
    throw new Error(error.trim());
  }
  
  return new TextDecoder().decode(result.stdout).trim();
}

async function getWorktreeName(currentPath: string, worktreeList: string): Promise<string> {
  const lines = worktreeList.split("\n");
  const mainWorktree = lines[0];
  
  if (mainWorktree.includes(currentPath)) {
    return "main";
  }
  
  return basename(currentPath);
}

export async function getCurrentBranch(): Promise<string> {
  try {
    return await getGitOutput(["branch", "--show-current"]);
  } catch {
    return "main";
  }
}
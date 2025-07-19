import { parseArgs } from "@std/cli";
import { join } from "@std/path";
import { exists } from "@std/fs";
import { findTaskDir } from "../lib/task.ts";
import { error, colors } from "../lib/colors.ts";

export async function showCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args, {
    boolean: ["help", "fzf"],
    alias: { h: "help" },
  });

  if (flags.help) {
    showHelp();
    return;
  }

  let taskId = flags._[0] as string;

  // If no task ID provided and not in FZF mode, show help
  if (!taskId && !flags.fzf) {
    // Enable FZF mode by default when no arguments
    flags.fzf = true;
  }

  // FZF mode (to be implemented later)
  if (flags.fzf) {
    console.log("FZF統合は後で実装されます");
    return;
  }

  if (!taskId) {
    error("タスクIDを指定してください");
    showHelp();
    Deno.exit(1);
  }

  const taskDir = await findTaskDir(taskId);
  
  if (!taskDir) {
    error(`タスクID '${taskId}' が見つかりません`);
    Deno.exit(1);
  }

  // Read and display TASK.md
  const taskMdPath = join(taskDir, "TASK.md");
  if (await exists(taskMdPath)) {
    const content = await Deno.readTextFile(taskMdPath);
    console.log(`${colors.blue}=== TASK.md ===${colors.reset}`);
    console.log(content);
  }

  // Read and display TODO.md
  const todoMdPath = join(taskDir, "TODO.md");
  if (await exists(todoMdPath)) {
    const content = await Deno.readTextFile(todoMdPath);
    console.log(`\n${colors.blue}=== TODO.md ===${colors.reset}`);
    console.log(content);
  }

  // Show directory structure
  console.log(`\n${colors.blue}=== ディレクトリ構造 ===${colors.reset}`);
  console.log(`${taskDir}/`);
  await showDirectoryTree(taskDir, "  ");
}

async function showDirectoryTree(path: string, prefix: string): Promise<void> {
  const entries = [];
  for await (const entry of Deno.readDir(path)) {
    entries.push(entry);
  }
  
  entries.sort((a, b) => {
    // Directories first, then files
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const marker = isLast ? "└── " : "├── ";
    
    console.log(`${prefix}${marker}${entry.name}${entry.isDirectory ? "/" : ""}`);
    
    if (entry.isDirectory) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      const subPath = join(path, entry.name);
      await showDirectoryTree(subPath, newPrefix);
    }
  }
}

function showHelp(): void {
  console.log(`使用方法: cctask show <task-id> [options]

タスクの詳細を表示します。

オプション:
    --fzf      FZFでインタラクティブに選択
    --help, -h このヘルプを表示

例:
    # タスクIDを指定
    cctask show 20250119_163000_main_auth-implementation
    
    # FZFでインタラクティブに選択
    cctask show --fzf
    cctask show          # 引数なしでもFZFモード`);
}
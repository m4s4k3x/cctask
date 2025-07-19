import { parseArgs } from "@std/cli";
import { relative } from "@std/path";
import { listTasks } from "../lib/task.ts";
import { colors } from "../lib/colors.ts";
import { TaskStatus } from "../types/task.ts";

export async function listCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args, {
    string: ["status"],
    boolean: ["help"],
    alias: { h: "help" },
  });

  if (flags.help) {
    showHelp();
    return;
  }

  const statusFilter = flags.status as TaskStatus | "all" | undefined;
  
  // Validate status
  if (statusFilter && !["active", "completed", "archived", "all"].includes(statusFilter)) {
    console.error(`${colors.red}エラー: 無効なステータス: ${statusFilter}${colors.reset}`);
    console.error("有効な値: active, completed, archived, all");
    Deno.exit(1);
  }

  const tasks = await listTasks(statusFilter);

  if (tasks.length === 0) {
    console.log("タスクが見つかりません");
    return;
  }

  // Group tasks by status
  const tasksByStatus = {
    active: tasks.filter(t => t.status === "active"),
    completed: tasks.filter(t => t.status === "completed"),
    archived: tasks.filter(t => t.status === "archived"),
  };

  // Display tasks
  for (const [status, statusTasks] of Object.entries(tasksByStatus)) {
    if (statusTasks.length === 0) continue;

    const statusColors = {
      active: colors.green,
      completed: colors.blue,
      archived: colors.yellow,
    };

    console.log(`\n${statusColors[status as keyof typeof statusColors]}=== ${status.toUpperCase()} ===${colors.reset}`);
    
    for (const task of statusTasks) {
      const taskId = task.path.split("/").pop() || "";
      const location = `${task.repository}/${task.worktree}/${task.branch}`;
      console.log(`  ${taskId} (${location})`);
    }
  }

  console.log(`\n合計: ${tasks.length} タスク`);
}

function showHelp(): void {
  console.log(`使用方法: cctask list [options]

タスク一覧を表示します。

オプション:
    --status <active|completed|archived|all>  表示するタスクのステータスを指定
    --help, -h                                このヘルプを表示

例:
    # アクティブなタスクのみ表示（デフォルト）
    cctask list
    
    # すべてのタスクを表示
    cctask list --status all
    
    # 完了したタスクのみ表示
    cctask list --status completed`);
}
import { parseArgs } from "@std/cli";
import { findTaskDir, setCurrentTaskId } from "../lib/task.ts";
import { error, success, info } from "../lib/colors.ts";

export async function switchCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args, {
    boolean: ["help", "fzf"],
    alias: { h: "help" },
  });

  if (flags.help) {
    showHelp();
    return;
  }

  let taskId = flags._[0] as string;

  // If no task ID provided and not in FZF mode, enable FZF by default
  if (!taskId && !flags.fzf) {
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

  // Set as current task
  await setCurrentTaskId(taskId);

  success("現在のタスクを切り替えました");
  info(`タスクID: ${taskId}`);
  info(`場所: ${taskDir}`);
}

function showHelp(): void {
  console.log(`使用方法: cctask switch <task-id> [options]

現在のタスクを切り替えます。

オプション:
    --fzf      FZFでインタラクティブに選択
    --help, -h このヘルプを表示

例:
    # タスクIDを指定
    cctask switch 20250119_163000_main_auth-implementation
    
    # FZFでインタラクティブに選択
    cctask switch --fzf
    cctask switch        # 引数なしでもFZFモード`);
}
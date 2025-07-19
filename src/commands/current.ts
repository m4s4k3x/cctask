import { parseArgs } from "@std/cli";
import { getCurrentTaskId, findTaskDir } from "../lib/task.ts";
import { getCurrentBranch } from "../lib/git.ts";
import { colors, info } from "../lib/colors.ts";

export async function currentCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args, {
    boolean: ["help"],
    alias: { h: "help" },
  });

  if (flags.help) {
    showHelp();
    return;
  }

  const branch = await getCurrentBranch();
  const taskId = await getCurrentTaskId();

  if (!taskId) {
    console.log(`ブランチ '${branch}' に現在のタスクが設定されていません`);
    return;
  }

  const taskDir = await findTaskDir(taskId);
  
  if (!taskDir) {
    console.log(`${colors.red}警告: タスクID '${taskId}' のディレクトリが見つかりません${colors.reset}`);
    console.log("タスクが削除されているか、移動された可能性があります");
    return;
  }

  console.log(`${colors.blue}現在のタスク${colors.reset}`);
  console.log(`ブランチ: ${colors.yellow}${branch}${colors.reset}`);
  console.log(`タスクID: ${colors.green}${taskId}${colors.reset}`);
  console.log(`場所: ${taskDir}`);
}

function showHelp(): void {
  console.log(`使用方法: cctask current

現在のタスクを表示します。

現在のタスクは Git ブランチごとに保持されます。
ブランチを切り替えると、そのブランチで最後に作業していたタスクが
自動的に現在のタスクとして設定されます。`);
}
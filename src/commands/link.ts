import { parseArgs } from "@std/cli";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { getCurrentTaskId, findTaskDir } from "../lib/task.ts";
import { getCurrentBranch } from "../lib/git.ts";
import { error, success, info } from "../lib/colors.ts";

export async function linkCommand(args: string[]): Promise<void> {
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
    error(`ブランチ '${branch}' に現在のタスクが設定されていません`);
    console.log("ヒント: 'cctask new' で新しいタスクを作成するか、'cctask switch' でタスクを切り替えてください");
    Deno.exit(1);
  }

  const taskDir = await findTaskDir(taskId);
  
  if (!taskDir) {
    error(`タスクID '${taskId}' のディレクトリが見つかりません`);
    Deno.exit(1);
  }

  const linkPath = join(Deno.cwd(), ".cctask");

  // Check if link already exists
  if (await exists(linkPath)) {
    try {
      const stat = await Deno.lstat(linkPath);
      if (stat.isSymlink) {
        const currentTarget = await Deno.readLink(linkPath);
        if (currentTarget === taskDir) {
          info("すでに同じタスクディレクトリへのリンクが存在します");
          return;
        }
        // Remove existing symlink
        await Deno.remove(linkPath);
      } else {
        error(".cctask は既に存在し、シンボリックリンクではありません");
        Deno.exit(1);
      }
    } catch (e) {
      error(`既存のリンクの確認中にエラーが発生しました: ${e.message}`);
      Deno.exit(1);
    }
  }

  // Create symlink
  try {
    await Deno.symlink(taskDir, linkPath);
    success("タスクディレクトリへのシンボリックリンクを作成しました");
    info(`${linkPath} -> ${taskDir}`);
  } catch (e) {
    error(`シンボリックリンクの作成に失敗しました: ${e.message}`);
    Deno.exit(1);
  }
}

function showHelp(): void {
  console.log(`使用方法: cctask link

現在のディレクトリに、現在のタスクディレクトリへのシンボリックリンクを作成します。

作成されるリンク:
    .cctask -> ~/.cctask/{repository}/{worktree}/{branch}/active/{task-id}

これにより、タスクディレクトリに簡単にアクセスできるようになります:
    cd .cctask          # タスクディレクトリに移動
    cat .cctask/TASK.md # タスク情報を確認
    ls .cctask/         # タスクファイルを一覧表示`);
}
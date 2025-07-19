#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run

import { parseArgs } from "@std/cli";
import { ensureDir } from "@std/fs";
import { getConfig } from "./lib/config.ts";
import { colors } from "./lib/colors.ts";

// Import commands
import { newCommand } from "./commands/new.ts";
import { listCommand } from "./commands/list.ts";
import { currentCommand } from "./commands/current.ts";
import { showCommand } from "./commands/show.ts";
import { switchCommand } from "./commands/switch.ts";
import { linkCommand } from "./commands/link.ts";
import { unlinkCommand } from "./commands/unlink.ts";

async function main() {
  const args = Deno.args;
  
  if (args.length === 0) {
    showHelp();
    Deno.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  // Ensure cctask root directory exists
  const config = getConfig();
  await ensureDir(config.cctaskRoot);

  try {
    switch (command) {
      case "new":
        await newCommand(commandArgs);
        break;
      case "list":
        await listCommand(commandArgs);
        break;
      case "current":
        await currentCommand(commandArgs);
        break;
      case "show":
        await showCommand(commandArgs);
        break;
      case "switch":
        await switchCommand(commandArgs);
        break;
      case "link":
        await linkCommand(commandArgs);
        break;
      case "unlink":
        await unlinkCommand(commandArgs);
        break;
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;
      default:
        console.error(`${colors.red}エラー: 不明なコマンド: ${command}${colors.reset}`);
        showHelp();
        Deno.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
    Deno.exit(1);
  }
}

function showHelp() {
  console.log(`cctask - Claude Code Task Management System

使用方法:
    cctask <command> [options]

コマンド:
    new <name>              新しいタスクを作成
    list                    タスク一覧を表示
    show <task-id>          タスクの詳細を表示
    current                 現在のタスクを表示
    switch <task-id>        現在のタスクを切り替える
    link                    現在のディレクトリにタスクディレクトリへのリンクを作成
    unlink                  タスクディレクトリへのシンボリックリンクを削除
    help                    このヘルプを表示

オプション:
    --priority <high|medium|low>     タスクの優先度を設定 (newコマンドで使用)
    --status <active|completed|all>  表示するタスクのステータスを指定 (listコマンドで使用)
    --fzf                           FZFでインタラクティブに選択 (show, switchコマンドで使用)

環境変数:
    CCTASK_ROOT            タスクの保存先ディレクトリ (デフォルト: ~/.cctask)

例:
    cctask new "認証機能の実装" --priority high
    cctask list --status active
    cctask switch 20250119_163000_main_auth-implementation

次に実装予定のコマンド:
    status <task-id> <status>  タスクのステータスを更新
    complete <task-id>         タスクを完了にする
    session add <note>         Claude Codeセッションを記録
    git-update                 現在のタスクのGit情報を更新`);
}

// Run main function
if (import.meta.main) {
  main();
}
import { parseArgs } from "@std/cli";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { error, success, info } from "../lib/colors.ts";

export async function unlinkCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args, {
    boolean: ["help"],
    alias: { h: "help" },
  });

  if (flags.help) {
    showHelp();
    return;
  }

  const linkPath = join(Deno.cwd(), ".cctask");

  if (!await exists(linkPath)) {
    info(".cctask リンクは存在しません");
    return;
  }

  try {
    const stat = await Deno.lstat(linkPath);
    if (!stat.isSymlink) {
      error(".cctask は存在しますが、シンボリックリンクではありません");
      Deno.exit(1);
    }

    await Deno.remove(linkPath);
    success("タスクディレクトリへのシンボリックリンクを削除しました");
  } catch (e) {
    error(`リンクの削除に失敗しました: ${e.message}`);
    Deno.exit(1);
  }
}

function showHelp(): void {
  console.log(`使用方法: cctask unlink

現在のディレクトリから .cctask シンボリックリンクを削除します。

これは 'cctask link' で作成したシンボリックリンクを削除するだけで、
タスクディレクトリ自体は削除されません。`);
}
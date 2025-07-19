import { parseArgs } from "@std/cli";
import { format } from "@std/datetime";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { TaskCreateOptions, Priority } from "../types/task.ts";
import { getGitInfo } from "../lib/git.ts";
import { createTaskDirectory, generateTaskId, setCurrentTaskId } from "../lib/task.ts";
import { loadTemplate } from "../lib/template.ts";
import { error, success, info, warn, colors } from "../lib/colors.ts";
import { prompt } from "../lib/prompt.ts";

export async function newCommand(args: string[]): Promise<void> {
  const flags = parseArgs(args, {
    string: ["priority", "description", "purpose", "success", "template"],
    boolean: ["auto", "no-interactive", "help"],
    alias: { h: "help" },
    collect: ["success"],
  });

  if (flags.help) {
    showHelp();
    return;
  }

  const options: TaskCreateOptions = {
    name: flags._[0] as string || "",
    priority: flags.priority as Priority,
    description: flags.description,
    purpose: flags.purpose,
    successConditions: flags.success || [],
    template: flags.template,
    interactive: !flags["no-interactive"] && !flags.auto,
    auto: flags.auto,
  };

  // Load template if specified
  if (options.template) {
    const template = await loadTemplate(options.template);
    if (template) {
      options.priority = options.priority || template.defaults.priority;
      options.description = options.description || template.descriptionTemplate;
      options.purpose = options.purpose || template.purposeTemplate;
      if (!options.successConditions?.length) {
        options.successConditions = template.successConditions;
      }
    } else {
      warn(`テンプレート '${options.template}' が見つかりません。デフォルトを使用します。`);
    }
  }

  // Interactive mode
  if (options.interactive) {
    options.name = options.name || await prompt("タスク名を入力してください: ");
    if (!options.name) {
      error("タスク名は必須です");
      Deno.exit(1);
    }

    if (!options.template) {
      console.log("\nテンプレートを使用しますか？");
      console.log("  1) 使用しない");
      console.log("  2) default  - 標準的なタスク");
      console.log("  3) bug-fix  - バグ修正");
      console.log("  4) feature  - 新機能開発");
      console.log("  5) refactor - リファクタリング");
      const templateChoice = await prompt("選択 [1-5] (Enter で 1): ");
      
      const templateMap: Record<string, string> = {
        "2": "default",
        "3": "bug-fix",
        "4": "feature",
        "5": "refactor",
      };
      
      if (templateMap[templateChoice]) {
        const template = await loadTemplate(templateMap[templateChoice]);
        if (template) {
          options.priority = options.priority || template.defaults.priority;
          options.description = options.description || template.descriptionTemplate;
          options.purpose = options.purpose || template.purposeTemplate;
          if (!options.successConditions?.length) {
            options.successConditions = template.successConditions;
          }
        }
      }
    }

    if (!options.priority) {
      console.log("\n優先度を選択してください:");
      console.log("  1) high   - 重要かつ緊急");
      console.log("  2) medium - 通常のタスク（デフォルト）");
      console.log("  3) low    - 重要度が低い");
      const priorityChoice = await prompt("選択 [1-3] (Enter で medium): ");
      
      const priorityMap: Record<string, Priority> = {
        "1": "high",
        "3": "low",
      };
      
      options.priority = priorityMap[priorityChoice] || "medium";
    }

    if (!options.description) {
      options.description = await prompt("\nタスクの概要を入力してください（省略可）: ");
    }

    if (!options.purpose) {
      options.purpose = await prompt("\nタスクの目的を入力してください（省略可）: ");
    }

    if (!options.successConditions?.length) {
      console.log("\n成功条件を入力してください（複数可、空行で終了）:");
      const conditions: string[] = [];
      let i = 1;
      while (true) {
        const condition = await prompt(`条件 ${i}: `);
        if (!condition) break;
        conditions.push(condition);
        i++;
      }
      options.successConditions = conditions;
    }
  } else {
    // Non-interactive mode validation
    if (!options.name) {
      error("タスク名を指定してください");
      showHelp();
      Deno.exit(1);
    }
    
    options.priority = options.priority || "medium";
  }

  // Validate priority
  if (!["high", "medium", "low"].includes(options.priority!)) {
    error("優先度は high, medium, low のいずれかを指定してください");
    Deno.exit(1);
  }

  // Get Git info
  let gitInfo;
  try {
    gitInfo = await getGitInfo();
  } catch (e) {
    error(e.message);
    Deno.exit(1);
  }

  // Generate task ID
  const taskId = generateTaskId(options.name);

  // Create task directory
  const taskDir = await createTaskDirectory(
    taskId,
    gitInfo.repositoryName,
    gitInfo.worktreeName,
    gitInfo.branch,
    "active"
  );

  // Show confirmation (unless auto mode)
  if (!options.auto) {
    console.log(`\n${colors.blue}=== タスク作成の確認 ===${colors.reset}`);
    console.log(`タスク名: ${colors.yellow}${options.name}${colors.reset}`);
    console.log(`優先度: ${options.priority}`);
    console.log(`タスクID: ${taskId}`);
    console.log(`場所: ${taskDir}`);
    if (options.description) {
      console.log(`概要: ${options.description}`);
    }
    if (options.purpose) {
      console.log(`目的: ${options.purpose}`);
    }
    if (options.successConditions?.length) {
      console.log("成功条件:");
      for (const condition of options.successConditions) {
        console.log(`  - ${condition}`);
      }
    }
    
    const response = await prompt("\n作成しますか？ (Y/n): ");
    if (response.toLowerCase() === "n") {
      console.log("キャンセルしました");
      return;
    }
  }

  // Create TASK.md
  const taskMdContent = generateTaskMd(options, taskId, gitInfo);
  await Deno.writeTextFile(join(taskDir, "TASK.md"), taskMdContent);

  // Create TODO.md
  const todoMdContent = generateTodoMd(options, taskId);
  await Deno.writeTextFile(join(taskDir, "TODO.md"), todoMdContent);

  // Create GIT_INFO.md
  const gitInfoMdContent = await generateGitInfoMd(gitInfo);
  await Deno.writeTextFile(join(taskDir, "GIT_INFO.md"), gitInfoMdContent);

  // Set as current task
  await setCurrentTaskId(taskId);

  // Show completion message
  if (options.auto) {
    console.log(`TASK_CREATED: ${taskId}`);
    console.log(`TASK_DIR: ${taskDir}`);
  } else {
    success("タスクを作成しました");
    info(`タスクID: ${taskId}`);
    info(`場所: ${taskDir}`);
    info("現在のタスクに設定されました");
  }
}

function showHelp(): void {
  console.log(`使用方法: cctask new [task-name] [options]

新しいタスクを作成します。タスク名を指定しない場合は対話形式で作成します。

オプション:
    --priority <high|medium|low>    タスクの優先度
    --description <text>            タスクの概要
    --purpose <text>                タスクの目的
    --success <condition>           成功条件（複数指定可）
    --template <name>               テンプレートを使用（default, bug-fix, feature, refactor）
    --auto                          Claude Code用の自動モード（確認なし）
    --no-interactive                対話形式を無効化
    --help, -h                      このヘルプを表示

例:
    # 対話形式で作成
    cctask new
    
    # タスク名のみ指定（他は対話形式）
    cctask new "API認証機能の実装"
    
    # すべてオプションで指定
    cctask new "API認証機能の実装" \\
        --priority high \\
        --description "JWTベースの認証システムを実装" \\
        --purpose "セキュアなAPIアクセスを提供" \\
        --success "認証エンドポイントが動作する" \\
        --success "トークンの有効期限が機能する"
    
    # Claude Code用（自動モード）
    cctask new "バグ修正" --auto --priority medium
    
    # テンプレートを使用
    cctask new "認証バグ修正" --template bug-fix`);
}

function generateTaskMd(options: TaskCreateOptions, taskId: string, gitInfo: any): string {
  const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  
  let content = `# タスク: ${options.name}

## Git情報
- **リポジトリ**: ${gitInfo.repositoryName}
- **リモートURL**: ${gitInfo.remoteUrl}
- **Worktree**: ${gitInfo.worktreeName} (${gitInfo.worktreePath})
- **ブランチ**: ${gitInfo.branch}
- **コミットハッシュ**: ${gitInfo.commitHash}

## メタ情報
- **タスクID**: ${taskId}
- **作成日**: ${now}
- **ステータス**: [ ] 未着手 [x] 進行中 [ ] 完了 [ ] 保留
- **優先度**: ${options.priority}

## 概要
${options.description || "[タスクの概要を記載]"}

## 目的
${options.purpose || "[何を達成したいのか]"}

## 成功条件
`;

  if (options.successConditions?.length) {
    for (const condition of options.successConditions) {
      content += `- [ ] ${condition}\n`;
    }
  } else {
    content += `- [ ] 条件1\n- [ ] 条件2\n`;
  }

  content += `
## Claude Codeセッション
| セッション | 開始時刻 | セッションID | 概要 | リンク |
|------------|----------|--------------|------|--------|

## 関連ファイル
- 作業ディレクトリ: \`${gitInfo.worktreePath}\`
- 変更ファイル:

## 進捗記録
### ${format(new Date(), "yyyy-MM-dd")}
- タスクを作成
- 次のアクション: 
`;

  return content;
}

function generateTodoMd(options: TaskCreateOptions, taskId: string): string {
  const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  
  let content = `# TODO: ${options.name}

## タスクID: ${taskId}

### 未完了
`;

  if (options.successConditions?.length) {
    for (const condition of options.successConditions) {
      content += `- [ ] ${condition}\n`;
    }
  } else {
    content += `- [ ] タスク項目1\n- [ ] タスク項目2\n`;
  }

  content += `
### 進行中

### 完了

---
*最終更新: ${now}*
`;

  return content;
}

async function generateGitInfoMd(gitInfo: any): Promise<string> {
  const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  
  // Get git status
  const statusCmd = new Deno.Command("git", {
    args: ["status", "--short"],
    stdout: "piped",
  });
  const statusResult = await statusCmd.output();
  const status = new TextDecoder().decode(statusResult.stdout);

  // Get recent commits
  const logCmd = new Deno.Command("git", {
    args: ["log", "--oneline", "-10"],
    stdout: "piped",
  });
  const logResult = await logCmd.output();
  const log = new TextDecoder().decode(logResult.stdout);

  // Get worktree list
  const worktreeCmd = new Deno.Command("git", {
    args: ["worktree", "list"],
    stdout: "piped",
  });
  const worktreeResult = await worktreeCmd.output();
  const worktreeList = new TextDecoder().decode(worktreeResult.stdout);

  return `# Git情報スナップショット

## 作成時点の情報
- **日時**: ${now}
- **リポジトリ**: ${gitInfo.repositoryName}
- **Worktree**: ${gitInfo.worktreeName}
- **ブランチ**: ${gitInfo.branch}
- **コミット**: ${gitInfo.commitHash}

## ステータス
\`\`\`
${status}
\`\`\`

## 最近のコミット
\`\`\`
${log}
\`\`\`

## Worktree一覧
\`\`\`
${worktreeList}
\`\`\`
`;
}
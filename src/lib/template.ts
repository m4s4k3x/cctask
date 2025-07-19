import { join } from "@std/path";
import { exists } from "@std/fs";
import { parse } from "@std/yaml";
import { TaskTemplate } from "../types/task.ts";

export async function loadTemplate(templateName: string): Promise<TaskTemplate | null> {
  const templatePaths = [
    join(Deno.cwd(), "templates", `${templateName}.yaml`),
    join(new URL("../../templates", import.meta.url).pathname, `${templateName}.yaml`),
  ];
  
  for (const templatePath of templatePaths) {
    if (await exists(templatePath)) {
      try {
        const content = await Deno.readTextFile(templatePath);
        const data = parse(content) as any;
        
        return {
          name: data.name || templateName,
          description: data.description || "",
          defaults: {
            priority: data.defaults?.priority || "medium",
            status: data.defaults?.status || "active",
          },
          descriptionTemplate: data.description_template || "",
          purposeTemplate: data.purpose_template || "",
          successConditions: data.success_conditions || [],
          todoItems: data.todo_items || [],
        };
      } catch (error) {
        console.error(`Failed to load template ${templateName}:`, error);
      }
    }
  }
  
  return null;
}

export async function getAvailableTemplates(): Promise<string[]> {
  const templates: string[] = [];
  const templateDir = join(new URL("../../templates", import.meta.url).pathname);
  
  if (await exists(templateDir)) {
    for await (const entry of Deno.readDir(templateDir)) {
      if (entry.isFile && entry.name.endsWith(".yaml")) {
        templates.push(entry.name.replace(".yaml", ""));
      }
    }
  }
  
  return templates;
}
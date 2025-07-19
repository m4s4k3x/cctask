import { join } from "@std/path";
import type { Config } from "../types/config.ts";

export function getConfig(): Config {
  const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
  const cctaskRoot = Deno.env.get("CCTASK_ROOT") || join(home, ".cctask");
  const currentTaskFile = join(cctaskRoot, ".current_task");

  return {
    cctaskRoot,
    currentTaskFile,
  };
}
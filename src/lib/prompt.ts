export async function prompt(message: string): Promise<string> {
  // Use Deno's prompt function
  const result = globalThis.prompt(message);
  return result || "";
}
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function pullThemeTemplates(options) {
  const themePath = await mkdtemp(join(tmpdir(), "mamapack-theme-"));
  const args = createPullArgs(options, themePath);

  await runShopifyCli(args);
  return themePath;
}

function createPullArgs(options, themePath) {
  const args = ["theme", "pull", "--store", options.storeDomain, "--path", themePath];
  addThemeSelector(args, options);
  addTemplateScope(args);
  return args;
}

function addThemeSelector(args, options) {
  if (options.themeId) {
    args.push("--theme", options.themeId);
    return;
  }

  args.push("--live");
}

function addTemplateScope(args) {
  args.push("--only", "templates/*.json");
}

async function runShopifyCli(args) {
  if (process.platform !== "win32") {
    await execFileAsync("shopify", args);
    return;
  }

  await execFileAsync("cmd.exe", ["/c", "shopify", ...args]);
}

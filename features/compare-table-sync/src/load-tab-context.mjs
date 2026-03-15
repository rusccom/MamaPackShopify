import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { pullThemeTemplates } from "./pull-theme-templates.mjs";

export async function loadTabContext(options) {
  const templates = await loadTemplates(options);
  const sectionMatch = findSectionMatch(templates, options);
  const tabItem = findTabItem(sectionMatch.section.blocks, options.tabKey);
  const products = collectTabProducts(sectionMatch.section.blocks, options.tabKey);

  return {
    templateFile: sectionMatch.templateFile,
    sectionId: sectionMatch.sectionId,
    tabKey: options.tabKey,
    compareTableAssigned: Boolean(tabItem.settings.compare_table),
    compareTableReference: tabItem.settings.compare_table ?? null,
    products,
  };
}

async function loadTemplates(options) {
  if (options.liveTheme) {
    const directory = await pullThemeTemplates(options);
    return readTemplateDirectory(directory);
  }

  return [await readTemplateEntry(options.templateFile)];
}

async function readTemplateDirectory(directory) {
  const templateFiles = await findTemplateFiles(directory);
  const templates = await Promise.all(templateFiles.map(readTemplateEntry));

  if (!templates.length) {
    throw new Error("No JSON templates were found in the pulled theme.");
  }

  return templates;
}

async function findTemplateFiles(directory) {
  const entries = await readdir(join(directory, "templates"), { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(directory, "templates", entry.name));
}

async function readTemplateEntry(templateFile) {
  const content = await readFile(templateFile, "utf8");
  return {
    templateFile,
    template: JSON.parse(stripTemplateComment(content)),
  };
}

function stripTemplateComment(content) {
  const commentEnd = content.indexOf("*/");
  return commentEnd === -1 ? content : content.slice(commentEnd + 2).trimStart();
}

function findSectionMatch(templates, options) {
  const matches = templates.flatMap((entry) => collectSectionMatches(entry, options.tabKey));

  if (options.sectionId) {
    return findBySectionId(matches, options.sectionId);
  }

  if (matches.length === 1) {
    return matches[0];
  }

  const tabMatches = matches.filter((match) => hasTabItem(match.section.blocks, options.tabKey));

  if (tabMatches.length === 1) {
    return tabMatches[0];
  }

  throw new Error("Provide --section-id when multiple MamaPack sections match.");
}

function collectSectionMatches(entry, tabKey) {
  return Object.entries(entry.template.sections ?? {})
    .filter(isTabsShowcaseEntry)
    .filter((sectionEntry) => hasTabItem(sectionEntry[1].blocks, tabKey))
    .map((sectionEntry) => createSectionMatch(entry.templateFile, sectionEntry));
}

function isTabsShowcaseEntry(entry) {
  return entry[1]?.type === "mamapack-tabs-showcase";
}

function hasTabItem(blocks, tabKey) {
  return Object.values(blocks ?? {}).some((block) => isMatchingTabItem(block, tabKey));
}

function createSectionMatch(templateFile, sectionEntry) {
  return {
    templateFile,
    sectionId: sectionEntry[0],
    section: sectionEntry[1],
  };
}

function findBySectionId(matches, requestedSectionId) {
  const match = matches.find((entry) => entry.sectionId === requestedSectionId);

  if (!match) {
    throw new Error(`Section ${requestedSectionId} was not found.`);
  }

  return match;
}

function findTabItem(blocks, tabKey) {
  const tabItem = Object.values(blocks ?? {}).find((block) => isMatchingTabItem(block, tabKey));

  if (!tabItem) {
    throw new Error(`Tab item with key ${tabKey} was not found.`);
  }

  return tabItem;
}

function isMatchingTabItem(block, tabKey) {
  return block.type === "tab_item" && normalizeTabKey(block.settings.tab_key) === tabKey;
}

function collectTabProducts(blocks, tabKey) {
  const products = Object.values(blocks ?? {})
    .filter((block) => isMatchingProductCard(block, tabKey))
    .map((block) => ({ handle: block.settings.product }));

  if (!products.length) {
    throw new Error(`Tab ${tabKey} does not contain product cards.`);
  }

  return products;
}

function isMatchingProductCard(block, tabKey) {
  return block.type === "product_card" && normalizeTabKey(block.settings.tab_key) === tabKey;
}

function normalizeTabKey(value) {
  return String(value ?? "").trim();
}

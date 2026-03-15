export function parseCliOptions(argv) {
  const args = createArgMap(argv);
  const options = {
    storeDomain: readRequired(args, "store-domain"),
    templateFile: readOptional(args, "template-file"),
    tabKey: readRequired(args, "tab-key"),
    sectionId: readOptional(args, "section-id"),
    compareTableHandle: args.get("compare-table-handle") ?? null,
    adminTokenFile: args.get("admin-token-file") ?? ".shopify/sync-admin-token.txt",
    liveTheme: args.has("live-theme"),
    themeId: readOptional(args, "theme-id"),
    json: args.has("json"),
    write: args.has("write"),
  };

  validateOptions(options);
  return options;
}

function createArgMap(argv) {
  const args = new Map();

  argv.forEach((arg, index) => {
    if (!arg.startsWith("--")) {
      return;
    }

    const key = arg.slice(2);
    const nextValue = argv[index + 1];
    const value = nextValue?.startsWith("--") ? true : nextValue ?? true;
    args.set(key, value);
  });

  return args;
}

function readRequired(args, key) {
  const value = args.get(key);

  if (!value || value === true) {
    throw new Error(`Missing required option --${key}.`);
  }

  return String(value).trim();
}

function readOptional(args, key) {
  const value = args.get(key);
  return !value || value === true ? null : String(value).trim();
}

function validateOptions(options) {
  if (options.templateFile || options.liveTheme) {
    return;
  }

  throw new Error("Provide --template-file or use --live-theme.");
}

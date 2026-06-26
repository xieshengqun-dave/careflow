const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// In a pnpm virtual-store layout, every transitive dep has its own symlinked
// node_modules and will find its own copy of react — extraNodeModules can't
// win against that.  resolveRequest fires before any node_modules walk, so it
// is the only reliable way to guarantee one React instance across the whole
// bundle and prevent the "Invalid hook call / useState of null" crash.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    try {
      return {
        filePath: require.resolve(moduleName, { paths: [projectRoot] }),
        type: "sourceFile",
      };
    } catch {
      // unusual subpath — fall through to default resolver
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

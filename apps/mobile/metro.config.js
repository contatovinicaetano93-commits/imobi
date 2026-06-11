const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.unstable_enableSymlinks = true;

// Prevent Metro from walking up the directory tree past the workspace root
// (required for pnpm's non-hierarchical node_modules structure)
config.resolver.disableHierarchicalLookup = true;

// Alias workspace packages directly to avoid pnpm symlink resolution issues
config.resolver.extraNodeModules = {
  "@imbobi/core": path.resolve(workspaceRoot, "packages/core"),
  "@imbobi/schemas": path.resolve(workspaceRoot, "packages/schemas"),
};

module.exports = config;

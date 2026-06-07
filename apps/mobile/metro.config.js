const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to watch all packages in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve modules from the mobile package first, then from the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Required for pnpm symlinks
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

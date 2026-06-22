const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const expoRouterRoot = path.dirname(
  require.resolve("expo-router/package.json", { paths: [projectRoot, monorepoRoot] }),
);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver = {
  ...config.resolver,
  disableHierarchicalLookup: true,
  unstable_enableSymlinks: true,
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
  ],
  extraNodeModules: {
    ...(config.resolver.extraNodeModules ?? {}),
    "expo-router": expoRouterRoot,
  },
  blockList: [
    ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
    /[\\/]services[\\/]api[\\/]/,
    /[\\/]apps[\\/]web[\\/]/,
    /[\\/]imobi-push[\\/]/,
    /[\\/]\.git[\\/]/,
  ],
  resolveRequest(context, moduleName, platform) {
    if (moduleName === "expo-router/entry") {
      return {
        type: "sourceFile",
        filePath: require.resolve("expo-router/entry", {
          paths: [projectRoot, monorepoRoot],
        }),
      };
    }

    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

config.useWatchman = false;

config.watcher = {
  ...config.watcher,
  unstable_autoSaveCache: { enabled: false },
  unstable_lazySha1: true,
  healthCheck: {
    ...(config.watcher?.healthCheck ?? {}),
    enabled: false,
  },
};

module.exports = config;

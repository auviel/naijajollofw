const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const apiTypes = path.resolve(workspaceRoot, "packages/api-types");
const ui = path.resolve(workspaceRoot, "packages/ui");
const appNodeModules = path.resolve(projectRoot, "node_modules");

const config = getSentryExpoConfig(projectRoot, {
  autoWrapExpoRouterErrorBoundary: true,
});

config.watchFolders = [...(config.watchFolders ?? []), apiTypes, ui];
// Prefer this app's node_modules so we don't pick up the Next.js workspace React.
config.resolver.nodeModulesPaths = [appNodeModules];
// Allow nested deps under packages in this app (e.g. expo/node_modules/*).
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@naijajollof/api-types": apiTypes,
  "@naijajollof/ui": ui,
  react: path.resolve(appNodeModules, "react"),
  "react-dom": path.resolve(appNodeModules, "react-dom"),
  "react-native": path.resolve(appNodeModules, "react-native"),
  "expo-blur": path.resolve(appNodeModules, "expo-blur"),
  "expo-glass-effect": path.resolve(appNodeModules, "expo-glass-effect"),
  "expo-modules-core": path.resolve(appNodeModules, "expo-modules-core"),
};
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

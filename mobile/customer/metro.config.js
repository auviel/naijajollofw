const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const apiTypes = path.resolve(projectRoot, "../packages/api-types");
const ui = path.resolve(projectRoot, "../packages/ui");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), apiTypes, ui];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@naijajollof/api-types": apiTypes,
  "@naijajollof/ui": ui,
};
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

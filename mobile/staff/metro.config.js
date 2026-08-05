const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const apiTypes = path.resolve(projectRoot, "../packages/api-types");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), apiTypes];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@naijajollof/api-types": apiTypes,
};
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

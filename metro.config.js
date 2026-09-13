const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const convexRoot = path.resolve(projectRoot, "../convex");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot, convexRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(convexRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;

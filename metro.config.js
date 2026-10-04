const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const convexRoot = path.resolve(projectRoot, "../convex");

const config = getDefaultConfig(projectRoot);

const watchFolders = [projectRoot];
const nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

if (fs.existsSync(convexRoot)) {
  watchFolders.push(convexRoot);
  const convexNodeModules = path.resolve(convexRoot, "node_modules");
  if (fs.existsSync(convexNodeModules)) {
    nodeModulesPaths.push(convexNodeModules);
  }
}

config.watchFolders = watchFolders;
config.resolver.nodeModulesPaths = nodeModulesPaths;

module.exports = config;

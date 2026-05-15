const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Use a Proxy to force resolution of critical packages to the workspace root
// and dynamically resolve others. This is a robust way to handle pnpm monorepos.
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      // Force these to the workspace root
      if (['react', 'react-dom', 'react-native'].includes(name)) {
        return path.resolve(workspaceRoot, 'node_modules', name);
      }
      // Handle workspace packages
      if (name === '@uniride/core') {
        return path.resolve(workspaceRoot, 'packages/core');
      }
      // Check local first, then root
      const localPath = path.resolve(projectRoot, 'node_modules', name);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
      return path.resolve(workspaceRoot, 'node_modules', name);
    },
  },
);

// Avoid hierarchical lookup to prevent Metro from getting confused by pnpm symlinks
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

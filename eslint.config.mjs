import expoConfig from 'eslint-config-expo/flat.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...expoConfig,
  {
    rules: {
      // Package is installed; Metro resolves it. Flat Expo config often fails to resolve the package root.
      'import/no-unresolved': ['error', { ignore: ['^@expo/vector-icons$'] }],
    },
  },
];

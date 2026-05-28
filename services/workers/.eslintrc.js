import rootConfig from '../../.eslintrc.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Workers: allow more flexibility with promises and async
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },
];

import rootConfig from '../../.eslintrc.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // NestJS specific: allow decorators
      '@typescript-eslint/explicit-function-return-types': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      // Allow class methods without return type hints in tests
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: true,
        },
      ],
    },
  },
];

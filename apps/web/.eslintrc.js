import rootConfig from '../../.eslintrc.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Next.js specific: allow React without import in JSX
      'react/react-in-jsx-scope': 'off',
      // Next.js has image optimization
      'react/no-unescaped-entities': 'warn',
    },
  },
];

import rootConfig from '../../.eslintrc.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // UI component library: be stricter on exports
      'react/react-in-jsx-scope': 'off',
    },
  },
];

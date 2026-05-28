import rootConfig from '../../.eslintrc.js';

export default [
  ...rootConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.jsx'],
    rules: {
      // React Native: no console warnings for debug in mobile
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
      // React Native has different JSX handling
      'react/react-in-jsx-scope': 'off',
    },
  },
];

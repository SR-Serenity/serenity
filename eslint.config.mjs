import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/test-output'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Airbnb-like baseline for spacing, blocks, and control-flow formatting
    rules: {
      'array-bracket-spacing': ['error', 'never'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'block-spacing': ['error', 'always'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'comma-dangle': 'off',
      'comma-spacing': ['error', { before: false, after: true }],
      curly: ['error', 'all'],
      'eol-last': ['error', 'always'],
      eqeqeq: ['error', 'always'],
      indent: ['error', 2, { SwitchCase: 1 }],
      'jsx-quotes': ['error', 'prefer-double'],
      'keyword-spacing': ['error', { before: true, after: true }],
      'max-len': ['error', { code: 100, ignoreUrls: true, ignoreStrings: true }],
      'no-mixed-spaces-and-tabs': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'operator-linebreak': 'off',
      'padded-blocks': ['error', 'never'],
      'quote-props': ['error', 'as-needed'],
      semi: 'off',
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': 'off',
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { words: true, nonwords: false }],
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
    },
  },
];

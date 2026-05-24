import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    }
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'chrome',
          message: 'Keep src/core platform-neutral. Use a storage adapter or platform entrypoint instead.'
        }
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../storage/*', '../../storage/*', 'src/storage/*'],
              message: 'Keep src/core independent from storage adapters and platform persistence.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['vite.config.ts'],
    languageOptions: {
      globals: globals.node
    }
  }
);

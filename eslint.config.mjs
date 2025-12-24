import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { includeIgnoreFile } from '@eslint/compat';
import pluginJs from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginPromise from 'eslint-plugin-promise';
import * as regexpPlugin from 'eslint-plugin-regexp';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

/** @type {import('eslint').Linter.Config[]} */
export default [
  globalIgnores(['./ecosystem.config.js']),
  {
    languageOptions: {
      parserOptions: {
        // There is a major issue with TS + ESLint + Monorepo
        // And we faced it as well https://github.com/typescript-eslint/typescript-eslint/issues/1192
        // However, using this "projectService" resolved it for us
        // More details on "projectService": https://typescript-eslint.io/blog/announcing-typescript-eslint-v8-beta#project-service
        projectService: true,
      },
    },
  },
  includeIgnoreFile(gitignorePath),
  pluginJs.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked.map((config) => ({
    files: ['**/*.{ts,tsx}'],
    ...config,
  })),
  pluginPromise.configs['flat/recommended'],
  eslintPluginUnicorn.configs.recommended,
  regexpPlugin.configs['flat/recommended'],
  {
    name: 'Custom rules for all the code',
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // Due to a bug: https://github.com/eslint/eslint/issues/19134
      // '@typescript-eslint/no-unused-expressions': 'off',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js builtins.
            [
              `^(${builtinModules.map((moduleName) => `node:${moduleName}`).join('|')})(/|$)`,
            ],
            // libs.
            [String.raw`^@?(\w|.)[^./]`],
            // Internal libs.
            // Same scope imports
            [
              String.raw`^@ymh8\/(\w|.)[^./]`,
              String.raw`^\.\.(?!/?$)`, // Parent imports. Put `..` last.
              String.raw`^\.\./?$`,
            ],
            // Other relative imports. Put same-folder imports and `.` last.
            [
              String.raw`^\./(?=.*/)(?!/?$)`,
              String.raw`^\.(?!/?$)`,
              String.raw`^\./?$`,
            ],
            // Style imports.
            [String.raw`^.+\.s?css$`],
            // Image imports.
            [String.raw`^.+\.svg|png|jpg$`],
          ],
        },
      ],
      // 'unicorn/expiring-todo-comments': 'off',
      // 'unicorn/prefer-top-level-await': 'off',
      'no-console': 'off',
      'unicorn/no-null': 'off',
      // 'unicorn/no-array-reduce': 'off',
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            generateStaticParams: true,
          },
        },
      ],
      'unicorn/no-process-exit': 'off',
    },
  },
  {
    files: ['apps/**/src/**/*.ts', 'packages/**/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // There is a major issue with TS + ESLint + Monorepo
        // And we faced it as well https://github.com/typescript-eslint/typescript-eslint/issues/1192
        // However, using this "projectService" resolved it for us
        // More details on "projectService": https://typescript-eslint.io/blog/announcing-typescript-eslint-v8-beta#project-service
        projectService: true,
      },
    },
    name: 'NodeJS only',
    rules: {
      // '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['apps/**/src/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        // There is a major issue with TS + ESLint + Monorepo
        // And we faced it as well https://github.com/typescript-eslint/typescript-eslint/issues/1192
        // However, using this "projectService" resolved it for us
        // More details on "projectService": https://typescript-eslint.io/blog/announcing-typescript-eslint-v8-beta#project-service
        projectService: true,
      },
    },
    name: 'Tests',
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      'unicorn/error-message': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
  },
  eslintConfigPrettier, // align prettier rules with eslint rules
];

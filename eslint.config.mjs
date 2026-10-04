// @ts-check
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.expo/**',
      '**/dist/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      '**/src/generated/**',
      '**/expo-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Web: Next.js rules (includes React + hooks + a11y).
  ...nextVitals.map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx}'] })),
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: { next: { rootDir: 'apps/web' } },
  },
  // Mobile: React hooks rules.
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // Shared core must stay platform-agnostic: no React, no Node built-ins.
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'next', 'next/*', 'expo*'],
              message: 'core must not depend on UI frameworks.',
            },
            {
              group: ['node:*', 'fs', 'path', 'crypto'],
              message: 'core must run on web, server and mobile.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);

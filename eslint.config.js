import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.worker },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // No bare `any` without an explicit suppression (CLAUDE.md: TypeScript standards).
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  // The engine directory is sacred: zero React imports, framework-agnostic.
  // This rule is the enforcement, not just the convention (CLAUDE.md: Code Organization).
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/engine/ must stay framework-agnostic. No React imports.' },
            { name: 'react-dom', message: 'src/engine/ must stay framework-agnostic. No React imports.' },
            { name: 'zustand', message: 'src/engine/ is the hot path. No Zustand; ink state lives outside React.' },
          ],
          patterns: [
            { group: ['react', 'react-dom', 'zustand', '@/store/*', '@/hooks/*', '@/components/*'], message: 'src/engine/ may not depend on React, the UI store, hooks, or components.' },
          ],
        },
      ],
    },
  },
  // Test and config files: relax the type-aware rules that fight test ergonomics.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'bench/**/*.ts', '*.config.{ts,js}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  prettier,
);

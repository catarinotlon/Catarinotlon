import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };
const configDir = fileURLToPath(new URL('./.storybook', import.meta.url));

const storybookProject = (theme: 'light' | 'dark') => ({
  plugins: [storybookTest({ configDir, initialGlobals: { theme } })],
  optimizeDeps: {
    include: [
      '@vercel/blob/client',
      'class-variance-authority',
      'next-intl',
      'next-intl/navigation',
      'next-intl/routing',
      'next/form',
      'next-themes',
      'react-email',
      'tailwind-merge',
    ],
  },
  test: {
    name: `storybook-${theme}`,
    sequence: { groupOrder: theme === 'light' ? 1 : 2 },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' as const }],
    },
  },
});

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.*',
        '**/*.stories.*',
        '**/*.contract.ts',
        '**/*-test-kit.ts',
        'src/test/**',
        '**/index.ts',
        '**/ports/**',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        'src/modules/*/domain/**': { lines: 90, statements: 90 },
        'src/modules/*/application/**': { lines: 90, statements: 90 },
      },
    },
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}'],
          server: { deps: { inline: ['next-intl'] } },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.integration.test.{ts,tsx}'],
          exclude: ['src/**/presentation/*.integration.test.{ts,tsx}', 'src/app/api/**'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            ...alias,
            'server-only': fileURLToPath(new URL('./src/test/empty-module.ts', import.meta.url)),
          },
        },
        test: {
          name: 'integration-actions',
          environment: 'node',
          include: [
            'src/**/presentation/*.integration.test.{ts,tsx}',
            'src/app/api/**/*.integration.test.ts',
          ],
          setupFiles: ['./src/test/action-setup.ts'],
          server: { deps: { inline: ['next-intl', /better-auth/] } },
          testTimeout: 20_000,
          hookTimeout: 20_000,
        },
      },
      storybookProject('light'),
      storybookProject('dark'),
    ],
  },
});

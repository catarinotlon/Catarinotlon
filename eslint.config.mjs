import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';

const layer = (type) => ({ element: { type } });
const sameModule = (type) => ({
  element: { type, captured: { module: '{{from.element.captured.module}}' } },
});

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'storybook-static/**',
      'docs/api/**',
      'drizzle/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      '.claude/worktrees/**',
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables through src/shared/infrastructure/env.ts.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'next/link', message: 'Import Link from @/i18n/navigation.' },
            {
              name: 'next/navigation',
              importNames: ['redirect', 'permanentRedirect', 'useRouter', 'usePathname'],
              message: 'Import navigation helpers from @/i18n/navigation.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/shared/infrastructure/env.ts',
      'src/shared/infrastructure/database-env.ts',
      'src/instrumentation.ts',
      'src/instrumentation-client.ts',
      'sentry.*.config.ts',
      'src/app/global-error.tsx',
      'src/test/**',
      'next.config.ts',
      'playwright.config.ts',
      'e2e/**',
    ],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/modules/*/infrastructure/**/*.ts', 'src/shared/infrastructure/**/*.ts'],
    ignores: ['**/in-memory-*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="delete"]',
          message: 'Hard deletes are forbidden. Use softDelete.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/modules/*/domain', capture: ['module'] },
        { type: 'application', pattern: 'src/modules/*/application', capture: ['module'] },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure', capture: ['module'] },
        { type: 'presentation', pattern: 'src/modules/*/presentation', capture: ['module'] },
        { type: 'module-api', pattern: 'src/modules/*', capture: ['module'] },
        { type: 'shared-domain', pattern: 'src/shared/domain' },
        { type: 'shared-infrastructure', pattern: 'src/shared/infrastructure' },
        { type: 'shared-ui', pattern: 'src/shared/ui' },
        { type: 'composition', pattern: 'src/composition' },
        { type: 'i18n', pattern: 'src/i18n' },
        { type: 'app', pattern: 'src/app' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: layer('domain'),
              allow: { to: [sameModule('domain'), layer('shared-domain')] },
            },
            {
              from: layer('application'),
              allow: {
                to: [
                  sameModule('domain'),
                  sameModule('application'),
                  layer('shared-domain'),
                  layer('module-api'),
                ],
              },
            },
            {
              from: layer('infrastructure'),
              allow: {
                to: [
                  sameModule('domain'),
                  sameModule('application'),
                  sameModule('infrastructure'),
                  layer('shared-domain'),
                  layer('shared-infrastructure'),
                  layer('module-api'),
                ],
              },
            },
            {
              from: layer('presentation'),
              allow: {
                to: [
                  sameModule('domain'),
                  sameModule('application'),
                  sameModule('presentation'),
                  layer('shared-domain'),
                  layer('shared-ui'),
                  layer('i18n'),
                  layer('module-api'),
                  layer('composition'),
                ],
              },
            },
            {
              from: layer('module-api'),
              allow: {
                to: [
                  sameModule('domain'),
                  sameModule('application'),
                  sameModule('infrastructure'),
                  sameModule('presentation'),
                  layer('shared-domain'),
                ],
              },
            },
            {
              from: layer('shared-domain'),
              allow: { to: layer('shared-domain') },
            },
            {
              from: layer('shared-infrastructure'),
              allow: {
                to: [layer('shared-infrastructure'), layer('shared-domain'), layer('i18n')],
              },
            },
            {
              from: layer('shared-ui'),
              allow: { to: [layer('shared-ui'), layer('i18n')] },
            },
            {
              from: layer('i18n'),
              allow: { to: layer('i18n') },
            },
            {
              from: layer('composition'),
              allow: {
                to: [
                  layer('composition'),
                  layer('module-api'),
                  layer('infrastructure'),
                  layer('shared-domain'),
                  layer('shared-infrastructure'),
                  layer('i18n'),
                ],
              },
            },
            {
              from: layer('app'),
              allow: {
                to: [
                  layer('app'),
                  layer('presentation'),
                  layer('module-api'),
                  layer('shared-ui'),
                  layer('shared-domain'),
                  layer('composition'),
                  layer('i18n'),
                ],
              },
            },
          ],
        },
      ],
    },
  },
  {
    // Tests wire in-memory doubles and real adapters together on purpose.
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.contract.ts', 'src/**/*-test-kit.ts'],
    rules: { 'boundaries/dependencies': 'off' },
  },
];

export default config;

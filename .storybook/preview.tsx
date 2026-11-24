import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

import en from '../messages/en.json';
import es from '../messages/es.json';
import '../src/app/globals.css';

const messages = { en, es };

function AppProviders({
  locale,
  theme,
  children,
}: {
  locale: 'en' | 'es';
  theme: 'light' | 'dark';
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = locale;
  }, [theme, locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="America/Mexico_City"
    >
      <ThemeProvider attribute="class" forcedTheme={theme} enableSystem={false}>
        <div className={`${theme === 'dark' ? 'dark' : ''}bg-background p-4 text-foreground`}>
          {children}
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

const withAppProviders: Decorator = (Story, context) => (
  <AppProviders
    locale={context.globals.locale === 'en' ? 'en' : 'es'}
    theme={context.globals.theme === 'dark' ? 'dark' : 'light'}
  >
    <Story />
  </AppProviders>
);

const preview: Preview = {
  decorators: [withAppProviders],
  globalTypes: {
    locale: {
      description: 'Locale',
      toolbar: {
        title: 'Locale',
        items: [
          { value: 'es', title: 'Español' },
          { value: 'en', title: 'English' },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'es', theme: 'light' },
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
    a11y: { test: 'error' },
  },
};

export default preview;

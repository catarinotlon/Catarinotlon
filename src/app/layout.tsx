import type { ReactNode } from 'react';

/** Root layout. The `<html>` element lives in the locale layout. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}

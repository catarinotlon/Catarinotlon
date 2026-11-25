'use client';

import { useEffect } from 'react';

import { toHexColor } from './hex-color';

function paintBrowserBar() {
  // The production CSS is minified, so the token may read `#fff`: always write six digits.
  const color = toHexColor(
    getComputedStyle(document.documentElement).getPropertyValue('--background'),
  );
  if (!color) return;
  let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'theme-color';
    document.head.append(tag);
  }
  if (tag.content !== color) tag.content = color;
}

/**
 * Keeps the phone's browser bar (`<meta name="theme-color">`) the color of the page background
 * in the active theme.
 *
 * @remarks
 * The runner picks the theme inside the app, so a `prefers-color-scheme` media query on the meta
 * tag cannot follow it. This watches the theme class next-themes sets on `<html>` and copies the
 * `--background` token, so the color is never written twice. It also watches `<head>`, because
 * a client navigation writes the server's light value back. It renders nothing.
 *
 * @returns Nothing visible.
 */
export function ThemeColorSync() {
  useEffect(() => {
    paintBrowserBar();
    const observer = new MutationObserver(paintBrowserBar);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // A client navigation rewrites the head with the server's light value.
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['content'],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}

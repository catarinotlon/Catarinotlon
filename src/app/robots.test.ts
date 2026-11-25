import { describe, expect, it } from 'vitest';

import robots, { LINK_PREVIEW_BOTS } from './robots';

describe('robots.txt', () => {
  it('closes the whole site to every crawler', () => {
    const rules = [robots().rules].flat();

    expect(rules.at(-1)).toEqual({ userAgent: '*', disallow: '/' });
  });

  it('lets only link-preview bots read pages, and never the API', () => {
    const rules = [robots().rules].flat();

    expect(rules[0]).toEqual({ userAgent: [...LINK_PREVIEW_BOTS], allow: '/', disallow: '/api/' });
    expect(LINK_PREVIEW_BOTS).toEqual(
      expect.arrayContaining(['Twitterbot', 'facebookexternalhit', 'WhatsApp', 'LinkedInBot']),
    );
  });

  it('lists no AI crawler among the allowed bots', () => {
    const ai = /gpt|claude|anthropic|ccbot|perplexity|extended|bytespider|meta-externalagent/i;

    expect(LINK_PREVIEW_BOTS.filter((bot) => ai.test(bot))).toEqual([]);
  });

  it('points to no sitemap', () => {
    expect(robots().sitemap).toBeUndefined();
  });
});

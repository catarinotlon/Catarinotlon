import { describe, expect, it } from 'vitest';

import { POSTHOG_PROXY_PATH, posthogOptions } from './posthog-options';

describe('posthogOptions', () => {
  it('stays off without a project key', () => {
    expect(posthogOptions(undefined)).toBeNull();
    expect(posthogOptions('')).toBeNull();
  });

  it('sends events through the site’s own path, so ad blockers do not drop them', () => {
    const options = posthogOptions('phc_test');

    expect(options?.config.api_host).toBe(POSTHOG_PROXY_PATH);
    expect(options?.config.ui_host).toBe('https://us.posthog.com');
  });

  it('never records what people type or the personal data on screen', () => {
    const { config } = posthogOptions('phc_test')!;

    expect(config.session_recording).toMatchObject({
      maskAllInputs: true,
      maskTextSelector: '[data-private], [data-private] *',
    });
    expect(config.mask_all_text).toBe(true);
    expect(config.mask_all_element_attributes).toBe(true);
  });

  it('keeps people anonymous and honours Do Not Track', () => {
    const { config } = posthogOptions('phc_test')!;

    expect(config.person_profiles).toBe('identified_only');
    expect(config.respect_dnt).toBe(true);
  });

  it('counts each page, including navigation inside the app', () => {
    expect(posthogOptions('phc_test')?.config.capture_pageview).toBe('history_change');
  });
});

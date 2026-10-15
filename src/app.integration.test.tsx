// @vitest-environment jsdom
/**
 * Real end-to-end integration test: mounts the full <App />, types text,
 * clicks Translate, and asserts on the LIVE MyMemory API response.
 * (No fetch mocking — this exercises the genuine provider path.)
 */
import { describe, expect, it, vi, afterEach, beforeAll } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeAll(() => {
  // jsdom polyfills for browser APIs the app touches.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 0);
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('LinguaFlow AI integration (live provider)', () => {
  it('translates English → Urdu with auto-detect and shows the detected language', async () => {
    const user = userEvent.setup();
    render(<App />);

    // App shell renders.
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /translate anything/i })).toBeTruthy();
    expect(screen.getByLabelText('Text to translate')).toBeTruthy();

    // Type source text (a full paragraph so detection is confident).
    const sourceText =
      'Hello everyone, welcome to our meeting today. We will discuss the quarterly results and plan for next month together.';
    const textarea = screen.getByLabelText('Text to translate') as HTMLTextAreaElement;
    await user.type(textarea, sourceText);
    expect(textarea.value).toBe(sourceText);

    // Target defaults to Urdu.
    expect(screen.getByLabelText(/To language/)).toBeTruthy();

    // Translate via the real API.
    await user.click(screen.getByRole('button', { name: /^Translate$/ }));

    // Urdu output appears (Arabic-script Unicode range).
    await waitFor(
      () => {
        const panel = screen.getByLabelText('Translated text');
        expect(/[\u0600-\u06FF]/.test(panel.textContent || '')).toBe(true);
      },
      { timeout: 30000 },
    );

    // Auto-detect chip names the source language.
    await waitFor(() => {
      expect(screen.getByText('Detected: English')).toBeTruthy();
    });

    // History recorded the entry.
    await user.click(screen.getByRole('button', { name: 'Translation history' }));
    const dialog = await screen.findByRole('dialog', { name: 'Translation history' });
    await waitFor(() => {
      expect(within(dialog).getByText(sourceText)).toBeTruthy();
    });
  }, 60000);

  it('swap moves the translation into the source box', async () => {
    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByLabelText('Text to translate') as HTMLTextAreaElement;
    await user.type(textarea, 'Good morning');
    await user.click(screen.getByRole('button', { name: /^Translate$/ }));

    await waitFor(
      () => {
        const panel = screen.getByLabelText('Translated text');
        expect((panel.textContent || '').trim().length).toBeGreaterThan(0);
      },
      { timeout: 30000 },
    );

    const translatedBefore = (screen.getByLabelText('Translated text').textContent || '').trim();
    expect(translatedBefore.length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Swap languages' }));

    // Source box now holds the previous translation; target panel is back to placeholder.
    expect((screen.getByLabelText('Text to translate') as HTMLTextAreaElement).value).toBe(translatedBefore);
    expect(screen.getByLabelText('Translated text').textContent || '').not.toContain(translatedBefore);
    expect(screen.getByText('Your translation will appear here.')).toBeTruthy();
  }, 60000);

  it('dark mode toggles the document class', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

import browser from 'webextension-polyfill';
import type { Message, MessageResult, PongData, BrowserTarget } from '@cf-studio/shared';
import { routeMessage } from './router';

const BROWSER: BrowserTarget = process.env.BROWSER as BrowserTarget;
const SW_START_TIME = Date.now();

browser.runtime.onInstalled.addListener((details) => {
  console.log('[CF Studio] Extension installed:', details.reason);
});

browser.runtime.onStartup.addListener(() => {
  console.log('[CF Studio] Browser startup — service worker initialized');
});

browser.runtime.onMessage.addListener((message: Message, sender) => {
  const tabUrl = sender.tab?.url ?? 'unknown';
  console.log(`[CF Studio] Background received "${message.type}" from ${message.source} (${tabUrl})`);

  if (message.type === 'ping') {
    return Promise.resolve({
      id: message.id,
      ok: true,
      data: {
        timestamp: Date.now(),
        browser: BROWSER,
        serviceWorkerAge: Date.now() - SW_START_TIME,
      } as PongData,
    } as MessageResult<PongData>);
  }

  return routeMessage(message, sender);
});

console.log('[CF Studio] Background service worker started (browser=' + BROWSER + ')');

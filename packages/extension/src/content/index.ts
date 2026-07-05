import browser from 'webextension-polyfill';
import type { Message, MessageResult, PongData, PingPayload, SaveProblemDataPayload } from '@cf-studio/shared';
import { scrapeCurrentPage } from './scraper';
import { mountEditorFrame } from './ui';

console.log('[CF Studio] Content script loaded on:', window.location.href);

const INITIAL_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    return 0;
}`;

async function pingBackground(): Promise<void> {
  const message: Message<PingPayload> = {
    id: crypto.randomUUID(),
    type: 'ping',
    target: 'background',
    source: 'content',
    payload: { timestamp: Date.now() },
  };

  try {
    const result = (await browser.runtime.sendMessage(message)) as MessageResult<PongData>;
    if (result.ok) {
      console.log('[CF Studio] ✓ Background responded:', result.data);
    } else {
      console.error('[CF Studio] ✗ Background error:', result.error);
    }
  } catch (err) {
    console.error('[CF Studio] ✗ Failed to message background:', err);
  }
}

async function syncProblemData() {
  const scraped = scrapeCurrentPage();
  if (!scraped) return;

  const payload: SaveProblemDataPayload = {
    problem: {
      id: scraped.problem.id,
      contestId: scraped.problem.contestId,
      index: scraped.problem.index,
      name: scraped.problem.name,
      rating: null,
      tags: [],
    },
    testCases: scraped.testCases,
  };

  const message: Message<SaveProblemDataPayload> = {
    id: crypto.randomUUID(),
    type: 'saveProblemData',
    target: 'background',
    source: 'content',
    payload,
  };

  try {
    const result = await browser.runtime.sendMessage(message);
    if (result.ok) {
      console.log('[CF Studio] ✓ Problem data saved to DB');
    } else {
      console.error('[CF Studio] ✗ Failed to save problem data:', result.error);
    }
  } catch (err) {
    console.error('[CF Studio] ✗ Exception during save:', err);
  }
}

setTimeout(pingBackground, 500);
setTimeout(syncProblemData, 1000);
setTimeout(() => mountEditorFrame(INITIAL_TEMPLATE, 'dark'), 1500);

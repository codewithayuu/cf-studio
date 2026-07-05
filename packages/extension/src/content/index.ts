import browser from 'webextension-polyfill';
import type { Message, MessageResult, PongData, PingPayload, SaveProblemDataPayload, UserSettings, GetProblemMetaData } from '@cf-studio/shared';
import { scrapeCurrentPage } from './scraper';
import { mountWorkspace } from './ui';
import { injectLayoutImprovements, injectProblemMeta } from './inject';

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

async function fetchAndInjectMeta(contestId: number, index: string) {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getProblemMeta',
    target: 'background',
    source: 'content',
    payload: { contestId, index }
  };
  
  try {
    const result = await browser.runtime.sendMessage(message) as MessageResult<GetProblemMetaData>;
    if (result.ok && result.data) {
      injectProblemMeta(contestId, index, result.data.rating, result.data.tags);
    }
  } catch (err) {
    console.error('[CF Studio] ✗ Failed to get problem meta', err);
  }
}

async function initWorkspace() {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getAllSettings',
    target: 'background',
    source: 'content',
    payload: {}
  };
  
  try {
    const result = await browser.runtime.sendMessage(message) as MessageResult<UserSettings>;
    if (result.ok && result.data) {
      const settings = result.data;
      injectLayoutImprovements(settings);
      
      const url = new URL(window.location.href);
      const parts = url.pathname.split('/').filter(Boolean);
      let contestId = 0;
      let index = '';
      
      if (url.pathname.startsWith('/problemset/problem/')) {
        contestId = parseInt(parts[2], 10);
        index = parts[3];
      } else {
        const cIdx = parts.findIndex(p => p === 'contest' || p === 'gym');
        if (cIdx !== -1) {
          contestId = parseInt(parts[cIdx + 1], 10);
          index = parts[cIdx + 3];
        }
      }
      
      if (contestId && index) {
        mountWorkspace(INITIAL_TEMPLATE, settings, contestId, index);
        fetchAndInjectMeta(contestId, index);
      }
    }
  } catch (err) {
    console.error('[CF Studio] ✗ Failed to get settings', err);
  }
}

setTimeout(pingBackground, 500);
setTimeout(syncProblemData, 1000);
setTimeout(initWorkspace, 1500);

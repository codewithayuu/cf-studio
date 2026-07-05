import browser from 'webextension-polyfill';
import type { Message, MessageResult, PongData, PingPayload, SaveProblemDataPayload, UserSettings, GetProblemMetaData, SubmitMeta, Template, AnalyticsData } from '@cf-studio/shared';
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

async function fetchAndInjectMeta(contestId: number, index: string, handle: string) {
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

  if (handle) {
    const anMsg: Message = {
      id: crypto.randomUUID(),
      type: 'getAnalytics',
      target: 'background',
      source: 'content',
      payload: { handle }
    };
    
    try {
      const anRes = await browser.runtime.sendMessage(anMsg) as MessageResult<AnalyticsData>;
      if (anRes.ok && anRes.data) {
        injectSolvedIndicators(new Set(anRes.data.solvedProblemIds));
      }
    } catch (err) {
      console.error('[CF Studio] ✗ Failed to get analytics for solved indicators', err);
    }
  }
}

function injectSolvedIndicators(solvedIds: Set<string>) {
  document.querySelectorAll('table.problems tbody tr').forEach(tr => {
    const link = tr.querySelector('a[href*="/problem/"]') as HTMLAnchorElement;
    if (!link) return;
    
    const href = link.getAttribute('href') || '';
    const parts = href.split('/');
    
    let pid = '';
    if (href.includes('/problemset/problem/')) {
      pid = `${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
    } else if (href.includes('/contest/') || href.includes('/gym/')) {
      const cId = parts[parts.length - 3];
      const idx = parts[parts.length - 1];
      pid = `${cId}-${idx}`;
    }
    
    if (pid && solvedIds.has(pid)) {
      if (tr.querySelector('.cf-solved-check')) return;
      const check = document.createElement('span');
      check.className = 'cf-solved-check';
      check.innerHTML = '✓';
      check.style.cssText = 'color: #a6e3a1; font-weight: bold; margin-right: 5px;';
      link.parentElement?.insertBefore(check, link);
    }
  });
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
    const [settingsResult, templatesResult] = await Promise.all([
      browser.runtime.sendMessage(message) as Promise<MessageResult<UserSettings>>,
      browser.runtime.sendMessage({ id: crypto.randomUUID(), type: 'getTemplates', target: 'background', source: 'content', payload: {} }) as Promise<MessageResult<Template[]>>,
    ]);

    if (settingsResult.ok && settingsResult.data) {
      const settings = settingsResult.data;
      const templates = templatesResult.ok && templatesResult.data ? templatesResult.data : [];
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
        const csrfMeta = document.querySelector('meta[name="X-Csrf-Token"]');
        const csrfToken = csrfMeta?.getAttribute('content') || '';
        
        const handleEl = document.querySelector('.lang a');
        const handle = handleEl ? (handleEl as HTMLElement).innerText.trim() : '';

        let submitUrl = '';
        let submittedProblemCode = '';
        
        if (url.pathname.startsWith('/problemset/problem/')) {
          submitUrl = '/problemset/submit?csrf_token=' + csrfToken;
          submittedProblemCode = `${contestId}${index}`;
        } else if (url.pathname.includes('/contest/') && url.pathname.includes('/problem/')) {
          submitUrl = `/contest/${contestId}/submit?csrf_token=` + csrfToken;
          submittedProblemCode = index;
        } else if (url.pathname.includes('/gym/') && url.pathname.includes('/problem/')) {
          submitUrl = `/gym/${contestId}/submit?csrf_token=` + csrfToken;
          submittedProblemCode = index;
        }

        const submitMeta: SubmitMeta = { csrfToken, submitUrl, submittedProblemCode, handle };
        
        mountWorkspace(INITIAL_TEMPLATE, settings, contestId, index, submitMeta, templates);
        fetchAndInjectMeta(contestId, index, handle);
      }
    }
  } catch (err) {
    console.error('[CF Studio] ✗ Failed to get settings', err);
  }
}

setTimeout(pingBackground, 500);
setTimeout(syncProblemData, 1000);
setTimeout(initWorkspace, 1500);

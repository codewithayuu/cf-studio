import browser from 'webextension-polyfill';

const CACHE_KEY = 'cf_problems_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface CacheData {
  timestamp: number;
  problems: Record<string, { rating: number | null; tags: string[] }>;
}

export async function getProblemMeta(contestId: number, index: string) {
  const cacheResult = await browser.storage.local.get(CACHE_KEY);
  const cache = cacheResult[CACHE_KEY] as CacheData | undefined;

  const now = Date.now();
  let problemsMap = cache?.problems;

  if (!cache || now - cache.timestamp > CACHE_TTL) {
    try {
      const res = await fetch('https://codeforces.com/api/problemset.problems');
      const data = await res.json();
      
      if (data.status === 'OK') {
        problemsMap = {};
        for (const p of data.result.problems) {
          problemsMap[`${p.contestId}-${p.index}`] = {
            rating: p.rating || null,
            tags: p.tags || []
          };
        }
        await browser.storage.local.set({
          [CACHE_KEY]: {
            timestamp: now,
            problems: problemsMap
          } as CacheData
        });
      } else {
        throw new Error('CF API returned non-OK status');
      }
    } catch (err) {
      console.error('[CF Studio] Failed to fetch CF API, falling back to stale cache:', err);
      if (!problemsMap) return null;
    }
  }

  const key = `${contestId}-${index}`;
  return problemsMap?.[key] || null;
}

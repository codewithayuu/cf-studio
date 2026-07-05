import browser from 'webextension-polyfill';
import type { AnalyticsData, TopicStrengthData } from '@cf-studio/shared';

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

export async function getAnalytics(handle: string): Promise<AnalyticsData | null> {
  try {
    const cacheResult = await browser.storage.local.get(CACHE_KEY);
    const problemsMap = (cacheResult[CACHE_KEY] as CacheData)?.problems || {};

    const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`);
    const data = await res.json();
    if (data.status !== 'OK') return null;

    const ratingTrend: Record<string, number> = {};
    const topicStrength: Record<string, TopicStrengthData> = {};
    const solvedProblemIds: string[] = [];
    let totalSolved = 0;

    const solvedSet = new Set<string>();

    for (const sub of data.result) {
      const pid = `${sub.problem.contestId}-${sub.problem.index}`;
      const tags = sub.problem.tags || [];
      const rating = problemsMap[pid]?.rating || sub.problem.rating || null;

      tags.forEach(tag => {
        if (!topicStrength[tag]) {
          topicStrength[tag] = { solved: 0, attempted: 0, avgRating: 0 };
        }
        topicStrength[tag].attempted++;
      });

      if (sub.verdict === 'OK' && !solvedSet.has(pid)) {
        solvedSet.add(pid);
        solvedProblemIds.push(pid);
        totalSolved++;

        if (rating) {
          ratingTrend[rating] = (ratingTrend[rating] || 0) + 1;
        }

        tags.forEach(tag => {
          topicStrength[tag].solved++;
          if (rating) {
            topicStrength[tag].avgRating = (topicStrength[tag].avgRating || 0) + rating;
          }
        });
      }
    }

    Object.keys(topicStrength).forEach(tag => {
      if (topicStrength[tag].solved > 0) {
        topicStrength[tag].avgRating = Math.round(topicStrength[tag].avgRating! / topicStrength[tag].solved);
      } else {
        topicStrength[tag].avgRating = null;
      }
    });

    return { totalSolved, ratingTrend, topicStrength, solvedProblemIds };
  } catch (err) {
    console.error('[CF Studio] Analytics fetch failed', err);
    return null;
  }
}

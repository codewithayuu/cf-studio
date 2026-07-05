import type { PageAdapter, ScrapedData } from "./base";
import { extractContestAndIndex, parseTestCases } from "./base";

export const problemsetAdapter: PageAdapter = {
  match(url: URL): boolean {
    return url.pathname.startsWith("/problemset/problem/");
  },
  scrape(doc: Document): ScrapedData | null {
    const url = new URL(doc.location.href);
    const ids = extractContestAndIndex(url);
    if (!ids) return null;

    const nameEl = doc.querySelector(
      ".problem-statement .title",
    ) as HTMLElement | null;
    const name = nameEl ? nameEl.innerText.trim() : "Unknown Problem";

    const testCases = parseTestCases(doc).map((tc) => ({
      ...tc,
      problemId: `${ids.contestId}-${ids.index}`,
    }));

    return {
      problem: {
        id: `${ids.contestId}-${ids.index}`,
        contestId: ids.contestId,
        index: ids.index,
        name,
      },
      testCases,
    };
  },
};

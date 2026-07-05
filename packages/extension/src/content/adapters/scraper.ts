import type { ScrapedData } from "./adapters/base";
import { problemsetAdapter } from "./adapters/problemset";
import { contestAdapter } from "./adapters/contest";

const adapters = [problemsetAdapter, contestAdapter];

export function scrapeCurrentPage(): ScrapedData | null {
  const url = new URL(window.location.href);

  for (const adapter of adapters) {
    if (adapter.match(url)) {
      try {
        const data = adapter.scrape(document);
        if (data) {
          console.log("[CF Studio] Scraped data:", data);
          return data;
        }
      } catch (err) {
        console.error("[CF Studio] Scraping failed with adapter:", err);
      }
    }
  }

  console.warn(
    "[CF Studio] No matching adapter or scraping failed for:",
    url.href,
  );
  return null;
}

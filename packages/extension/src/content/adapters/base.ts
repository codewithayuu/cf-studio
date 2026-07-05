import type { Problem, TestCase } from "@cf-studio/shared";

export interface ScrapedData {
  problem: Omit<Problem, "rating" | "tags">;
  testCases: TestCase[];
}

export interface PageAdapter {
  match(url: URL): boolean;
  scrape(doc: Document): ScrapedData | null;
}

export function extractContestAndIndex(
  url: URL,
): { contestId: number; index: string } | null {
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname.startsWith("/problemset/problem/")) {
    if (parts.length >= 3) {
      return { contestId: parseInt(parts[2], 10), index: parts[3] };
    }
  } else if (url.pathname.includes("/problem/")) {
    if (parts.length >= 4) {
      const contestIdx = parts.findIndex(
        (p) => p === "contest" || p === "gym" || p === "contest",
      );
      if (
        contestIdx !== -1 &&
        parts[contestIdx + 1] &&
        parts[contestIdx + 2] === "problem"
      ) {
        return {
          contestId: parseInt(parts[contestIdx + 1], 10),
          index: parts[contestIdx + 3],
        };
      }
    }
  }

  return null;
}

export function parseTestCases(doc: Document): TestCase[] {
  const testCases: TestCase[] = [];
  const inputs = doc.querySelectorAll(".sample-test .input pre");
  const outputs = doc.querySelectorAll(".sample-test .output pre");

  const count = Math.min(inputs.length, outputs.length);

  for (let i = 0; i < count; i++) {
    const inputEl = inputs[i] as HTMLElement;
    const outputEl = outputs[i] as HTMLElement;

    const input = inputEl.innerText.trim();
    const expectedOutput = outputEl.innerText.trim();

    if (input) {
      testCases.push({
        problemId: "",
        input,
        expectedOutput,
        source: "sample",
      });
    }
  }

  return testCases;
}

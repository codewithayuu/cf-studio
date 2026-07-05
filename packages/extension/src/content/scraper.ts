export interface ScrapedData {
  problem: {
    id: string;
    contestId: number;
    index: string;
    name: string;
  };
  testCases: {
    input: string;
    expectedOutput: string;
    source: 'sample';
  }[];
}

export function scrapeCurrentPage(): ScrapedData | null {
  const url = new URL(window.location.href);
  const parts = url.pathname.split('/').filter(Boolean);

  let contestId = 0;
  let index = '';
  let name = '';

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

  if (!contestId || !index) return null;

  const titleEl = document.querySelector('.problem-statement .title');
  if (titleEl) {
    name = titleEl.textContent?.replace(/^[A-Z][0-9]*\.\s*/, '').trim() || '';
  }

  const testCases: ScrapedData['testCases'] = [];
  const inputEls = document.querySelectorAll('.sample-test .input pre');
  const outputEls = document.querySelectorAll('.sample-test .output pre');

  for (let i = 0; i < Math.min(inputEls.length, outputEls.length); i++) {
    testCases.push({
      input: (inputEls[i] as HTMLElement).textContent || '',
      expectedOutput: (outputEls[i] as HTMLElement).textContent || '',
      source: 'sample',
    });
  }

  return {
    problem: { id: `${contestId}-${index}`, contestId, index, name },
    testCases,
  };
}

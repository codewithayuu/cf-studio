export interface DiffResult {
  prefix: string;
  oldDiff: string;
  newDiff: string;
  oldSuffix: boolean;
  newSuffix: boolean;
}

export function findFirstDivergence(oldStr: string, newStr: string): DiffResult | null {
  const minLen = Math.min(oldStr.length, newStr.length);
  let i = 0;
  while (i < minLen && oldStr[i] === newStr[i]) i++;
  
  if (i === oldStr.length && i === newStr.length) return null;
  
  const start = Math.max(0, i - 15);
  const contextEnd = i + 25;
  
  return {
    prefix: oldStr.substring(start, i),
    oldDiff: oldStr.substring(i, contextEnd),
    newDiff: newStr.substring(i, contextEnd),
    oldSuffix: oldStr.length > contextEnd,
    newSuffix: newStr.length > contextEnd
  };
}

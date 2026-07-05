export interface Problem {
  id: string;
  contestId: number;
  index: string;
  name: string;
  rating: number | null;
  tags: string[];
}

export interface TestCase {
  problemId: string;
  input: string;
  expectedOutput: string | null;
  source: 'sample' | 'custom';
}

export type NoteTag =
  | 'observation'
  | 'mistake'
  | 'trick'
  | 'editorial'
  | 'dp-transition'
  | 'graph-pattern'
  | 'revision';

export interface Note {
  id: string;
  problemId: string;
  body: string;
  tags: NoteTag[];
  createdAt: number;
  updatedAt: number;
}

export interface SubmissionRecord {
  problemId: string;
  verdict: string;
  language: string;
  submittedAt: number;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  layoutPreset: '50/50' | 'statement-heavy' | 'editor-heavy' | 'custom';
  layoutRatio: number;
  pinnedLanguages: number[];
  proSuggestions: boolean;
}

export interface SubmitMeta {
  csrfToken: string;
  submitUrl: string;
  submittedProblemCode: string;
  handle: string;
}

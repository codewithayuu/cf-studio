import type { Problem, TestCase, UserSettings, SubmitMeta, Note, Template, AnalyticsData } from './models';

export type MessageTarget = 'background' | 'content' | 'editor-frame' | 'popup';

export interface Message<T = unknown> {
  id: string;
  type: string;
  target: MessageTarget;
  source: MessageTarget;
  payload: T;
}

export interface MessageResult<T = unknown> {
  id: string;
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PingPayload {
  timestamp: number;
}

export interface PongData {
  timestamp: number;
  browser: string;
  serviceWorkerAge: number;
}

export interface ScrapeProblemPayload {
  url: string;
  html: string;
}

export type ScrapeProblemData = {
  problem: Problem;
  testCases: TestCase[];
};

export type GetProblemDataPayload = {
  contestId: number;
  index: string;
};

export type SaveProblemDataPayload = ScrapeProblemData;

export type GetSettingPayload<K extends keyof UserSettings> = {
  key: K;
};

export type GetSettingData<K extends keyof UserSettings> = UserSettings[K];

export type SetSettingPayload = {
  key: keyof UserSettings;
  value: any;
};

export type GetAllSettingsData = UserSettings;

export type GetProblemMetaPayload = {
  contestId: number;
  index: string;
};

export type GetProblemMetaData = {
  rating: number | null;
  tags: string[];
} | null;

export type RunCodePayload = {
  code: string;
  stdin: string;
};

export type RunCodeData = {
  stdout: string;
  stderr: string;
  exitCode: number;
  wallTime: number;
  peakMemory: number | null;
};

export type SubmitCodePayload = {
  actionUrl: string;
  csrfToken: string;
  submittedProblemCode: string;
  programTypeId: number;
  source: string;
};

export type SubmitCodeData = {
  success: boolean;
  error?: string;
};

export type PollSubmissionPayload = {
  handle: string;
  contestId: number;
  index: string;
  minSubmissionId: number;
};

export type PollSubmissionData = {
  id: number;
  verdict: string | null;
  passedTestCount: number | null;
  timeConsumed: number | null;
  memoryConsumed: number | null;
} | null;

export type GetNotesPayload = { problemId: string };
export type GetNotesData = Note[];
export type SaveNotePayload = { note: Note };
export type DeleteNotePayload = { id: string };
export type SearchNotesPayload = { query: string };
export type SearchNotesData = Note[];
export type GetTemplatesData = Template[];
export type SaveTemplatePayload = { template: Template };
export type DeleteTemplatePayload = { id: string };
export type GetAnalyticsPayload = { handle: string };
export type GetAnalyticsData = AnalyticsData | null;
export type GetSolvedProblemsData = { solvedIds: string[] };

export type MessageMap = {
  ping: { payload: PingPayload; data: PongData };
  scrapeProblem: { payload: ScrapeProblemPayload; data: ScrapeProblemData };
  saveProblemData: { payload: SaveProblemDataPayload; data: void };
  getProblemData: { payload: GetProblemDataPayload; data: ScrapeProblemData | null };
  getSetting: { payload: GetSettingPayload<keyof UserSettings>; data: any };
  setSetting: { payload: SetSettingPayload; data: void };
  getAllSettings: { payload: Record<string, never>; data: GetAllSettingsData };
  getProblemMeta: { payload: GetProblemMetaPayload; data: GetProblemMetaData };
  runCode: { payload: RunCodePayload; data: RunCodeData };
  submitCode: { payload: SubmitCodePayload; data: SubmitCodeData };
  pollSubmission: { payload: PollSubmissionPayload; data: PollSubmissionData };
  getNotes: { payload: GetNotesPayload; data: GetNotesData };
  saveNote: { payload: SaveNotePayload; data: void };
  deleteNote: { payload: DeleteNotePayload; data: void };
  searchNotes: { payload: SearchNotesPayload; data: SearchNotesData };
  getTemplates: { payload: Record<string, never>; data: GetTemplatesData };
  saveTemplate: { payload: SaveTemplatePayload; data: void };
  deleteTemplate: { payload: DeleteTemplatePayload; data: void };
  getAnalytics: { payload: GetAnalyticsPayload; data: GetAnalyticsData };
  getSolvedProblems: { payload: Record<string, never>; data: GetSolvedProblemsData };
};

export type MessageType = keyof MessageMap;

export type MessagePayload<T extends MessageType> = MessageMap[T]['payload'];
export type MessageData<T extends MessageType> = MessageMap[T]['data'];

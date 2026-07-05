export type BrowserTarget = "chrome" | "firefox";

export type MessageTarget = "background" | "content" | "editor-frame" | "popup";

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
  browser: BrowserTarget;
  serviceWorkerAge: number;
}

export type PingMessage = Message<PingPayload> & { type: "ping" };
export type PongResult = MessageResult<PongData>;

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
  source: "sample" | "custom";
}

export type NoteTag =
  | "observation"
  | "mistake"
  | "trick"
  | "editorial"
  | "dp-transition"
  | "graph-pattern"
  | "revision";

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

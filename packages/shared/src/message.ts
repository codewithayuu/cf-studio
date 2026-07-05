import type { Problem, TestCase, UserSettings } from "./models";

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

export type SetSettingPayload<K extends keyof UserSettings> = {
  key: K;
  value: UserSettings[K];
};

export type MessageMap = {
  ping: { payload: PingPayload; data: PongData };
  scrapeProblem: { payload: ScrapeProblemPayload; data: ScrapeProblemData };
  saveProblemData: { payload: SaveProblemDataPayload; data: void };
  getProblemData: {
    payload: GetProblemDataPayload;
    data: ScrapeProblemData | null;
  };
  getSetting: { payload: GetSettingPayload<keyof UserSettings>; data: any };
  setSetting: { payload: SetSettingPayload<keyof UserSettings>; data: void };
};

export type MessageType = keyof MessageMap;

export type MessagePayload<T extends MessageType> = MessageMap[T]["payload"];
export type MessageData<T extends MessageType> = MessageMap[T]["data"];

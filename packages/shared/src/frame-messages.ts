export type FrameMessage =
  | {
      source: "content";
      type: "INIT_EDITOR";
      payload: { theme: "dark" | "light"; initialCode: string };
    }
  | { source: "frame"; type: "EDITOR_READY"; payload: Record<string, never> }
  | { source: "frame"; type: "CODE_CHANGED"; payload: { code: string } }
  | { source: "content"; type: "REQUEST_CODE"; payload: Record<string, never> };

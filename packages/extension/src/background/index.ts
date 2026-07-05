import browser from "webextension-polyfill";
import type {
  Message,
  MessageResult,
  PongData,
  BrowserTarget,
} from "@cf-studio/shared";

const BROWSER: BrowserTarget = process.env.BROWSER as BrowserTarget;
const SW_START_TIME = Date.now();

browser.runtime.onInstalled.addListener((details) => {
  console.log("[CF Studio] Extension installed:", details.reason);
  if (details.reason === "install") {
    console.log("[CF Studio] First install — welcome!");
  }
});

browser.runtime.onStartup.addListener(() => {
  console.log("[CF Studio] Browser startup — service worker initialized");
});

browser.runtime.onMessage.addListener((message: Message, sender) => {
  const tabUrl = sender.tab?.url ?? "unknown";
  console.log(
    `[CF Studio] Background received "${message.type}" from ${message.source} (${tabUrl})`,
  );

  switch (message.type) {
    case "ping":
      return handlePing(message);

    default:
      console.warn("[CF Studio] Unknown message type:", message.type);
      return Promise.resolve({
        id: message.id,
        ok: false,
        error: `Unknown message type: ${message.type}`,
      } satisfies MessageResult);
  }
});

async function handlePing(message: Message): Promise<MessageResult<PongData>> {
  return {
    id: message.id,
    ok: true,
    data: {
      timestamp: Date.now(),
      browser: BROWSER,
      serviceWorkerAge: Date.now() - SW_START_TIME,
    },
  };
}

console.log(
  "[CF Studio] Background service worker started (browser=" + BROWSER + ")",
);

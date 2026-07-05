import browser from "webextension-polyfill";
import type {
  Message,
  MessageResult,
  PongData,
  BrowserTarget,
} from "@cf-studio/shared";

declare const process: { env: { BROWSER?: string } };

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

browser.runtime.onMessage.addListener((raw: unknown, sender: browser.Runtime.MessageSender) => {
  const msg = raw as Message;
  const tabUrl = sender.tab?.url ?? "unknown";
  console.log(
    `[CF Studio] Background received "${msg.type}" from ${msg.source} (${tabUrl})`,
  );

  switch (msg.type) {
    case "ping":
      return handlePing(msg);

    default:
      console.warn("[CF Studio] Unknown message type:", msg.type);
      return Promise.resolve({
        id: msg.id,
        ok: false,
        error: `Unknown message type: ${msg.type}`,
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

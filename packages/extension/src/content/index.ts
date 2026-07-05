import browser from "webextension-polyfill";
import type {
  Message,
  MessageResult,
  PongData,
  PingPayload,
} from "@cf-studio/shared";

console.log("[CF Studio] Content script loaded on:", window.location.href);

async function pingBackground(): Promise<void> {
  const message: Message<PingPayload> = {
    id: crypto.randomUUID(),
    type: "ping",
    target: "background",
    source: "content",
    payload: { timestamp: Date.now() },
  };

  try {
    const result = (await browser.runtime.sendMessage(
      message,
    )) as MessageResult<PongData>;

    if (result.ok) {
      console.log("[CF Studio] ✓ Background responded:", result.data);
    } else {
      console.error("[CF Studio] ✗ Background error:", result.error);
    }
  } catch (err) {
    console.error("[CF Studio] ✗ Failed to message background:", err);
  }
}

setTimeout(pingBackground, 500);

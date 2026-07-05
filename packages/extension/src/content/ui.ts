import browser from "webextension-polyfill";
import type { FrameMessage } from "@cf-studio/shared";

export function mountEditorFrame(initialCode: string, theme: "dark" | "light") {
  const existing = document.getElementById("cf-studio-container");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "cf-studio-container";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.right = "0";
  container.style.width = "50vw";
  container.style.height = "100vh";
  container.style.zIndex = "999999";
  container.style.boxShadow = "-4px 0 15px rgba(0,0,0,0.3)";
  container.style.display = "flex";
  container.style.flexDirection = "column";

  const iframe = document.createElement("iframe");
  const extUrl = browser.runtime.getURL("editor-frame/index.html");
  iframe.src = extUrl;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  iframe.addEventListener("load", () => {
    const msg: FrameMessage = {
      source: "content",
      type: "INIT_EDITOR",
      payload: { theme, initialCode },
    };
    iframe.contentWindow?.postMessage(msg, "*");
  });

  container.appendChild(iframe);
  document.body.appendChild(container);

  window.addEventListener("message", (event) => {
    const message = event.data as FrameMessage;
    if (message?.source !== "frame") return;

    if (message.type === "EDITOR_READY") {
      console.log("[CF Studio] Frame reported ready");
    } else if (message.type === "CODE_CHANGED") {
      console.log(
        "[CF Studio] Code changed in frame (len):",
        message.payload.code.length,
      );
    }
  });
}

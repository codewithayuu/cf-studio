import * as monaco from "monaco-editor";
import { initMonaco, updateTemplates } from './monaco';
import type { FrameMessage } from '@cf-studio/shared';

const container = document.getElementById('editor-container');
if (!container) throw new Error('Editor container missing');

let editor = initMonaco(container, '// CF Studio initializing...', 'dark');

window.addEventListener('message', (event) => {
  const message = event.data as FrameMessage;
  if (message?.source !== 'content') return;

  switch (message.type) {
    case 'INIT_EDITOR':
      editor.setModel(monaco.editor.createModel(message.payload.initialCode, 'cpp'));
      monaco.editor.setTheme(message.payload.theme === 'dark' ? 'cf-studio-dark' : 'cf-studio-light');
      if (message.payload.templates) {
        updateTemplates(message.payload.templates);
      }
      break;
    case 'REQUEST_CODE':
      const code = editor.getValue();
      const reply: FrameMessage = { source: 'frame', type: 'CODE_CHANGED', payload: { code } };
      event.source?.postMessage(reply, { targetOrigin: event.origin });
      break;
  }
});

editor.onDidChangeModelContent(() => {
  const code = editor.getValue();
  const message: FrameMessage = { source: 'frame', type: 'CODE_CHANGED', payload: { code } };
  window.parent.postMessage(message, '*');
});

const readyMsg: FrameMessage = { source: 'frame', type: 'EDITOR_READY', payload: {} };
window.parent.postMessage(readyMsg, '*');

console.log('[CF Studio] Editor frame initialized. crossOriginIsolated:', crossOriginIsolated);

import browser from 'webextension-polyfill';
import type { Message, MessageResult, PongData } from '@cf-studio/shared';
import { routeMessage } from './router';
import { initSync } from '../lib/sync';

console.log('[CF Studio] Background worker starting');

initSync();

browser.runtime.onMessage.addListener(
  (message: unknown, sender: browser.Runtime.MessageSender) => {
    const msg = message as Message;

    if (msg.type === 'ping') {
      const result: MessageResult<PongData> = {
        id: msg.id,
        ok: true,
        data: {
          pong: true,
          timestamp: Date.now(),
          backgroundAlive: true,
        },
      };
      return Promise.resolve(result);
    }

    return routeMessage(msg, sender) as Promise<MessageResult>;
  },
);

export {};

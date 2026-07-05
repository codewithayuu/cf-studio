import browser from 'webextension-polyfill';
import type { Message, MessageResult, MessageType, MessageData, MessagePayload } from '@cf-studio/shared';
import { saveProblemData, getProblemData } from '../lib/db';
import { getSetting, setSetting, getAllSettings } from '../lib/storage';
import { getProblemMeta } from './api';

type MessageHandler<T extends MessageType> = (
  payload: MessagePayload<T>,
  sender: browser.Runtime.MessageSender
) => Promise<MessageData<T>>;

const handlers: Partial<{ [T in MessageType]: MessageHandler<T> }> = {
  saveProblemData: async (payload) => {
    await saveProblemData(payload.problem, payload.testCases);
  },
  getProblemData: async (payload) => {
    return await getProblemData(payload.contestId, payload.index);
  },
  getSetting: async (payload) => {
    return await getSetting(payload.key);
  },
  setSetting: async (payload) => {
    await setSetting(payload.key, payload.value);
  },
  getAllSettings: async () => {
    return await getAllSettings();
  },
  getProblemMeta: async (payload) => {
    return await getProblemMeta(payload.contestId, payload.index);
  },
};

export async function routeMessage<T extends MessageType>(
  message: Message<MessagePayload<T>>,
  sender: browser.Runtime.MessageSender
): Promise<MessageResult<MessageData<T>>> {
  const handler = handlers[message.type as MessageType] as MessageHandler<T> | undefined;

  if (!handler) {
    return {
      id: message.id,
      ok: false,
      error: `No handler registered for message type: ${message.type}`,
    };
  }

  try {
    const data = await handler(message.payload, sender);
    return {
      id: message.id,
      ok: true,
      data,
    };
  } catch (err: any) {
    console.error(`[CF Studio] Error handling ${message.type}:`, err);
    return {
      id: message.id,
      ok: false,
      error: err.message || 'Unknown execution error',
    };
  }
}

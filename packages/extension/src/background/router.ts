import browser from 'webextension-polyfill';
import type { Message, MessageResult, MessageType, MessageData, MessagePayload } from '@cf-studio/shared';
import { saveProblemData, getProblemData, getNotes, saveNote, deleteNote, getAllNotes, getTemplates, saveTemplate, deleteTemplate } from '../lib/db';
import { getSetting, setSetting, getAllSettings } from '../lib/storage';
import { getProblemMeta, getAnalytics } from './api';
import { runCode } from './executor';
import { submitCode, pollSubmission } from './submitter';
import { pushNote as syncNote, removeNote as syncRemoveNote, pushTemplate as syncTemplate, removeTemplate as syncRemoveTemplate } from '../lib/sync';
import FlexSearch from 'flexsearch';

const NoteIndex = new FlexSearch.Document<{ id: string; body: string; tags: string[] }>({
  document: { id: 'id', index: ['body', 'tags'] },
  tokenize: 'forward',
  cache: true,
});

let noteIndexBuilt = false;

async function ensureNoteIndex() {
  if (noteIndexBuilt) return;
  const all = await getAllNotes();
  for (const n of all) {
    NoteIndex.add({ id: n.id, body: n.body, tags: n.tags });
  }
  noteIndexBuilt = true;
}

function rebuildNoteIndex(all: { id: string; body: string; tags: string[] }[]) {
  NoteIndex.remove({ id: '' } as any);
  NoteIndex.clear();
  for (const n of all) {
    NoteIndex.add(n);
  }
}

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
  runCode: async (payload) => {
    return await runCode(payload);
  },
  submitCode: async (payload) => {
    return await submitCode(payload);
  },
  pollSubmission: async (payload) => {
    return await pollSubmission(payload);
  },
  getNotes: async (payload) => {
    return await getNotes(payload.problemId);
  },
  saveNote: async (payload) => {
    await saveNote(payload.note);
    NoteIndex.add({ id: payload.note.id, body: payload.note.body, tags: payload.note.tags });
    syncNote(payload.note);
  },
  deleteNote: async (payload) => {
    await deleteNote(payload.id);
    NoteIndex.remove(payload.id as any);
    syncRemoveNote(payload.id);
  },
  searchNotes: async (payload) => {
    await ensureNoteIndex();
    const results = await NoteIndex.search(payload.query, { enrich: true });
    const ids = new Set<string>();
    for (const r of results) {
      for (const item of r.result) {
        ids.add(item as string);
      }
    }
    const all = await getAllNotes();
    return all.filter(n => ids.has(n.id));
  },
  getTemplates: async () => {
    return await getTemplates();
  },
  saveTemplate: async (payload) => {
    await saveTemplate(payload.template);
    syncTemplate(payload.template);
  },
  deleteTemplate: async (payload) => {
    await deleteTemplate(payload.id);
    syncRemoveTemplate(payload.id);
  },
  getAnalytics: async (payload) => {
    return await getAnalytics(payload.handle);
  },
  getSolvedProblems: async () => {
    return { solvedIds: [] };
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

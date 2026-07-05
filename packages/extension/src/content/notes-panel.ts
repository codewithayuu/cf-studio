import browser from 'webextension-polyfill';
import type { Message, MessageResult, Note, NoteTag, GetNotesData } from '@cf-studio/shared';

let currentProblemId = '';
let notesContainer: HTMLElement | null = null;
let saveTimeout: number | null = null;

const AVAILABLE_TAGS: NoteTag[] = ['observation', 'mistake', 'trick', 'editorial', 'dp-transition', 'graph-pattern', 'revision'];

export async function mountNotesPanel(container: HTMLElement, problemId: string) {
  currentProblemId = problemId;
  notesContainer = container;
  
  injectNotesStyles();
  container.innerHTML = `<div id="cf-notes-list"></div><button id="cf-add-note" class="cf-studio-btn" style="margin: 8px;">+ Add Note</button>`;
  
  await loadNotes();
  
  document.getElementById('cf-add-note')?.addEventListener('click', () => addNote());
}

function injectNotesStyles() {
  if (document.getElementById('cf-notes-styles')) return;
  const style = document.createElement('style');
  style.id = 'cf-notes-styles';
  style.textContent = `
    #cf-studio-notes { padding: 8px; overflow-y: auto; }
    .cf-note-card { background: #1e1e2e; border: 1px solid #313244; border-radius: 4px; margin-bottom: 8px; }
    .cf-note-tags { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid #313244; flex-wrap: wrap; }
    .cf-note-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: #313244; color: #cdd6f4; cursor: pointer; text-transform: capitalize; }
    .cf-note-tag.active { background: #89b4fa; color: #1e1e2e; }
    .cf-note-textarea { width: 100%; box-sizing: border-box; background: transparent; border: none; color: #cdd6f4; padding: 8px; font-family: monospace; font-size: 12px; resize: vertical; min-height: 60px; outline: none; }
    .cf-note-footer { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; font-size: 10px; color: #6c7086; }
    .cf-note-delete { color: #f38ba8; cursor: pointer; background: none; border: none; font-size: 10px; }
  `;
  document.head.appendChild(style);
}

async function loadNotes() {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getNotes',
    target: 'background',
    source: 'content',
    payload: { problemId: currentProblemId }
  };
  
  try {
    const res = await browser.runtime.sendMessage(message) as MessageResult<GetNotesData>;
    if (res.ok && res.data) {
      renderNotes(res.data);
    }
  } catch (e) {
    console.error('[CF Studio] Failed to load notes', e);
  }
}

function renderNotes(notes: Note[]) {
  const list = document.getElementById('cf-notes-list');
  if (!list) return;
  list.innerHTML = '';
  
  if (notes.length === 0) {
    list.innerHTML = `<div style="color: #6c7086; font-size: 12px; padding: 8px;">No notes yet. Click '+ Add Note' to start.</div>`;
    return;
  }
  
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'cf-note-card';
    card.dataset.id = note.id;
    
    const tagsHtml = AVAILABLE_TAGS.map(t => 
      `<div class="cf-note-tag ${note.tags.includes(t) ? 'active' : ''}" data-tag="${t}">${t.replace('-', ' ')}</div>`
    ).join('');
    
    card.innerHTML = `
      <div class="cf-note-tags">${tagsHtml}</div>
      <textarea class="cf-note-textarea" placeholder="Write markdown...">${note.body}</textarea>
      <div class="cf-note-footer">
        <span>Updated ${new Date(note.updatedAt).toLocaleString()}</span>
        <button class="cf-note-delete">Delete</button>
      </div>
    `;
    
    list.appendChild(card);
    
    card.querySelectorAll('.cf-note-tag').forEach(tagEl => {
      tagEl.addEventListener('click', () => toggleTag(note.id, (tagEl as HTMLElement).dataset.tag as NoteTag));
    });
    
    const textarea = card.querySelector('textarea') as HTMLTextAreaElement;
    textarea.addEventListener('input', () => {
      note.body = textarea.value;
      debounceSave(note);
    });
    
    card.querySelector('.cf-note-delete')?.addEventListener('click', () => deleteNote(note.id));
  });
}

function debounceSave(note: Note) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    note.updatedAt = Date.now();
    const message: Message = {
      id: crypto.randomUUID(),
      type: 'saveNote',
      target: 'background',
      source: 'content',
      payload: { note }
    };
    browser.runtime.sendMessage(message);
    
    const footer = document.querySelector(`.cf-note-card[data-id="${note.id}"] .cf-note-footer span`);
    if (footer) footer.textContent = `Updated ${new Date(note.updatedAt).toLocaleString()}`;
  }, 500);
}

async function addNote() {
  const newNote: Note = {
    id: crypto.randomUUID(),
    problemId: currentProblemId,
    body: '',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'saveNote',
    target: 'background',
    source: 'content',
    payload: { note: newNote }
  };
  await browser.runtime.sendMessage(message);
  await loadNotes();
  
  const list = document.getElementById('cf-notes-list');
  if (list) list.scrollTop = list.scrollHeight;
}

async function deleteNote(id: string) {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'deleteNote',
    target: 'background',
    source: 'content',
    payload: { id }
  };
  await browser.runtime.sendMessage(message);
  await loadNotes();
}

async function toggleTag(id: string, tag: NoteTag) {
  const card = document.querySelector(`.cf-note-card[data-id="${id}"]`);
  if (!card) return;
  
  const tagEl = card.querySelector(`.cf-note-tag[data-tag="${tag}"]`);
  if (!tagEl) return;
  
  const isActive = tagEl.classList.contains('active');
  
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getNotes',
    target: 'background',
    source: 'content',
    payload: { problemId: currentProblemId }
  };
  
  const res = await browser.runtime.sendMessage(message) as MessageResult<GetNotesData>;
  if (!res.ok || !res.data) return;
  
  const note = res.data.find(n => n.id === id);
  if (!note) return;
  
  if (isActive) {
    note.tags = note.tags.filter(t => t !== tag);
  } else {
    note.tags.push(tag);
  }
  note.updatedAt = Date.now();
  
  const saveMsg: Message = {
    id: crypto.randomUUID(),
    type: 'saveNote',
    target: 'background',
    source: 'content',
    payload: { note }
  };
  await browser.runtime.sendMessage(saveMsg);
  await loadNotes();
}

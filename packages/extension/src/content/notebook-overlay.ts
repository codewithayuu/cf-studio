import browser from 'webextension-polyfill';
import type { Message, MessageResult, SearchNotesData } from '@cf-studio/shared';

export async function mountNotebookOverlay() {
  if (document.getElementById('cf-notebook-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'cf-notebook-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999999; display:flex; justify-content:center; align-items:center;';
  
  overlay.innerHTML = `
    <div style="width:800px; height:600px; background:#1e1e2e; border-radius:8px; display:flex; flex-direction:column; color:#cdd6f4;">
      <div style="padding:12px; display:flex; gap:12px; border-bottom:1px solid #313244;">
        <input id="cf-nb-search" type="text" placeholder="Search notes..." style="flex:1; background:#313244; border:1px solid #45475a; color:#cdd6f4; padding:8px; border-radius:4px; outline:none;">
        <button id="cf-nb-close" class="cf-studio-btn">Close</button>
      </div>
      <div id="cf-nb-results" style="flex:1; overflow-y:auto; padding:12px;"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('cf-nb-close')?.addEventListener('click', () => overlay.remove());
  
  const searchInput = document.getElementById('cf-nb-search') as HTMLInputElement;
  searchInput.addEventListener('input', () => searchNotes(searchInput.value));
  
  await searchNotes('');
}

async function searchNotes(query: string) {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'searchNotes',
    target: 'background',
    source: 'content',
    payload: { query }
  };
  
  const res = await browser.runtime.sendMessage(message) as MessageResult<SearchNotesData>;
  const resultsEl = document.getElementById('cf-nb-results');
  if (!res.ok || !resultsEl) return;
  
  const notes = res.data;
  if (notes.length === 0) {
    resultsEl.innerHTML = `<div style="color:#6c7086; text-align:center; margin-top:20px;">No notes found.</div>`;
    return;
  }
  
  resultsEl.innerHTML = '';
  notes.forEach(note => {
    const card = document.createElement('div');
    card.style.cssText = 'background:#181825; border:1px solid #313244; border-radius:4px; padding:10px; margin-bottom:10px; cursor:pointer;';
    
    const tagsHtml = note.tags.map(t => `<span style="font-size:10px; background:#313244; padding:2px 6px; border-radius:3px; margin-right:4px;">${t}</span>`).join('');
    
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="font-weight:bold; color:#89b4fa;">${note.problemId}</span>
        <span style="font-size:11px; color:#6c7086;">${new Date(note.updatedAt).toLocaleDateString()}</span>
      </div>
      <div style="font-size:13px; margin-bottom:6px; white-space:pre-wrap; max-height:80px; overflow:hidden; text-overflow:ellipsis;">${note.body || '(empty)'}</div>
      <div>${tagsHtml}</div>
    `;
    
    card.addEventListener('click', () => {
      const [contestId, index] = note.problemId.split('-');
      window.open(`https://codeforces.com/problemset/problem/${contestId}/${index}`, '_blank');
    });
    
    resultsEl.appendChild(card);
  });
}

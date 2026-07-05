import browser from 'webextension-polyfill';
import type { Message, MessageResult, Template, GetTemplatesData } from '@cf-studio/shared';

export async function mountTemplatesModal() {
  if (document.getElementById('cf-templates-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'cf-templates-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center;';
  
  overlay.innerHTML = `
    <div style="width:600px; height:500px; background:#1e1e2e; border-radius:8px; display:flex; flex-direction:column; color:#cdd6f4;">
      <div style="padding:12px; display:flex; justify-content:space-between; border-bottom:1px solid #313244;">
        <h3 style="margin:0; font-size:16px;">Templates Manager</h3>
        <button id="cf-tpl-close" class="cf-studio-btn">Close</button>
      </div>
      <div id="cf-tpl-list" style="flex:1; overflow-y:auto; padding:12px;"></div>
      <div style="padding:12px; border-top:1px solid #313244;">
        <button id="cf-tpl-add" class="cf-studio-btn primary">+ New Template</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('cf-tpl-close')?.addEventListener('click', () => overlay.remove());
  document.getElementById('cf-tpl-add')?.addEventListener('click', () => addTemplate());
  
  await loadTemplates();
}

async function loadTemplates() {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getTemplates',
    target: 'background',
    source: 'content',
    payload: {}
  };
  
  const res = await browser.runtime.sendMessage(message) as MessageResult<GetTemplatesData>;
  const list = document.getElementById('cf-tpl-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!res.ok || !res.data || res.data.length === 0) {
    list.innerHTML = `<div style="color:#6c7086; text-align:center; margin-top:20px;">No templates yet. Use /trigger in editor to insert.</div>`;
    return;
  }
  
  res.data.forEach(tpl => {
    const card = document.createElement('div');
    card.style.cssText = 'background:#181825; border:1px solid #313244; border-radius:4px; padding:8px; margin-bottom:8px;';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; gap: 8px;">
        <input type="text" class="tpl-name" value="${tpl.name}" style="background:#313244; border:1px solid #45475a; color:#cdd6f4; padding:4px; border-radius:3px; flex: 1;">
        <input type="text" class="tpl-trigger" value="${tpl.trigger}" style="background:#313244; border:1px solid #45475a; color:#cdd6f4; padding:4px; border-radius:3px; width: 30%;">
        <button class="cf-tpl-delete" style="background:#f38ba8; color:#1e1e2e; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Delete</button>
      </div>
      <textarea class="tpl-body" style="width:100%; box-sizing:border-box; background:#11111b; border:1px solid #313244; color:#cdd6f4; padding:4px; border-radius:3px; min-height:80px; resize:vertical; font-family:monospace; font-size:12px;">${tpl.body}</textarea>
    `;
    
    list.appendChild(card);
    
    const nameEl = card.querySelector('.tpl-name') as HTMLInputElement;
    const trigEl = card.querySelector('.tpl-trigger') as HTMLInputElement;
    const bodyEl = card.querySelector('.tpl-body') as HTMLTextAreaElement;
    
    const save = () => {
      tpl.name = nameEl.value;
      tpl.trigger = trigEl.value;
      tpl.body = bodyEl.value;
      tpl.updatedAt = Date.now();
      const msg: Message = {
        id: crypto.randomUUID(),
        type: 'saveTemplate',
        target: 'background',
        source: 'content',
        payload: { template: tpl }
      };
      browser.runtime.sendMessage(msg);
    };
    
    nameEl.addEventListener('input', save);
    trigEl.addEventListener('input', save);
    bodyEl.addEventListener('input', save);
    
    card.querySelector('.cf-tpl-delete')?.addEventListener('click', async () => {
      const msg: Message = {
        id: crypto.randomUUID(),
        type: 'deleteTemplate',
        target: 'background',
        source: 'content',
        payload: { id: tpl.id }
      };
      await browser.runtime.sendMessage(msg);
      loadTemplates();
    });
  });
}

async function addTemplate() {
  const newTpl: Template = {
    id: crypto.randomUUID(),
    name: 'New Template',
    trigger: '/new',
    body: '// template code',
    updatedAt: Date.now()
  };
  
  const msg: Message = {
    id: crypto.randomUUID(),
    type: 'saveTemplate',
    target: 'background',
    source: 'content',
    payload: { template: newTpl }
  };
  await browser.runtime.sendMessage(msg);
  await loadTemplates();
}

import browser from 'webextension-polyfill';
import type { FrameMessage, UserSettings, Message } from '@cf-studio/shared';

let currentRatio = 0.5;
let currentPreset: UserSettings['layoutPreset'] = '50/50';
let isPortraitMode = false;
let editorFrame: HTMLIFrameElement | null = null;
let initialCodeState = '';

const PRESET_RATIOS: Record<Exclude<UserSettings['layoutPreset'], 'custom'>, number> = {
  '50/50': 0.5,
  'statement-heavy': 0.65,
  'editor-heavy': 0.35,
};

export function mountWorkspace(initialCode: string, settings: UserSettings) {
  initialCodeState = initialCode;
  currentPreset = settings.layoutPreset;
  currentRatio = settings.layoutRatio || PRESET_RATIOS['50/50'];
  
  isPortraitMode = window.matchMedia('(orientation: portrait)').matches && window.innerWidth < 1024;

  injectStyles();
  rebuildLayoutDOM();
  applyDimension();

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
    e.preventDefault();
    cyclePreset();
  }
}

function cyclePreset() {
  const presets: UserSettings['layoutPreset'][] = ['50/50', 'statement-heavy', 'editor-heavy'];
  const currentIdx = presets.indexOf(currentPreset === 'custom' ? '50/50' : currentPreset);
  const nextPreset = presets[(currentIdx + 1) % presets.length];
  changePreset(nextPreset);
}

function handleResize() {
  const newIsPortrait = window.matchMedia('(orientation: portrait)').matches && window.innerWidth < 1024;
  if (newIsPortrait !== isPortraitMode) {
    isPortraitMode = newIsPortrait;
    rebuildLayoutDOM();
  }
  applyDimension();
}

function injectStyles() {
  if (document.getElementById('cf-studio-styles')) return;
  const style = document.createElement('style');
  style.id = 'cf-studio-styles';
  style.textContent = `
    #cf-studio-shell {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 2147483647;
      display: flex;
    }
    #cf-studio-shell.portrait {
      left: 0;
      bottom: 0;
      top: auto;
      flex-direction: column;
    }
    #cf-studio-divider {
      background: #1e1e2e;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    #cf-studio-divider:hover, #cf-studio-divider.dragging {
      background: #89b4fa;
    }
    #cf-studio-shell.landscape #cf-studio-divider {
      width: 6px;
      height: 100vh;
      cursor: ew-resize;
    }
    #cf-studio-shell.portrait #cf-studio-divider {
      height: 6px;
      width: 100vw;
      cursor: ns-resize;
    }
    #cf-studio-pane {
      background: #1e1e2e;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 15px rgba(0,0,0,0.3);
    }
    #cf-studio-toolbar {
      height: 40px;
      background: #181825;
      display: flex;
      align-items: center;
      padding: 0 10px;
      gap: 8px;
      border-bottom: 1px solid #313244;
    }
    .cf-studio-btn {
      background: #313244;
      color: #cdd6f4;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
      font-size: 12px;
    }
    .cf-studio-btn.active {
      background: #89b4fa;
      color: #1e1e2e;
    }
    #cf-studio-editor-container {
      flex: 1;
      overflow: hidden;
    }
    body.cf-studio-active #page {
      transition: margin 0.2s ease;
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add('cf-studio-active');
}

function rebuildLayoutDOM() {
  document.getElementById('cf-studio-shell')?.remove();

  const shell = document.createElement('div');
  shell.id = 'cf-studio-shell';
  shell.classList.add(isPortraitMode ? 'portrait' : 'landscape');

  const divider = document.createElement('div');
  divider.id = 'cf-studio-divider';
  
  const pane = document.createElement('div');
  pane.id = 'cf-studio-pane';

  const toolbar = document.createElement('div');
  toolbar.id = 'cf-studio-toolbar';
  
  const presets: UserSettings['layoutPreset'][] = ['50/50', 'statement-heavy', 'editor-heavy'];
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'cf-studio-btn';
    btn.dataset.preset = p;
    btn.innerText = p === '50/50' ? '50/50' : p === 'statement-heavy' ? 'Stmt' : 'Edit';
    if (currentPreset === p) btn.classList.add('active');
    btn.addEventListener('click', () => changePreset(p));
    toolbar.appendChild(btn);
  });

  const editorContainer = document.createElement('div');
  editorContainer.id = 'cf-studio-editor-container';

  pane.appendChild(toolbar);
  pane.appendChild(editorContainer);
  shell.appendChild(divider);
  shell.appendChild(pane);
  document.body.appendChild(shell);

  if (!editorFrame) {
    editorFrame = document.createElement('iframe');
    editorFrame.src = browser.runtime.getURL('editor-frame/index.html');
    editorFrame.style.width = '100%';
    editorFrame.style.height = '100%';
    editorFrame.style.border = 'none';

    editorFrame.addEventListener('load', () => {
      const msg: FrameMessage = { source: 'content', type: 'INIT_EDITOR', payload: { theme: 'dark', initialCode: initialCodeState } };
      editorFrame?.contentWindow?.postMessage(msg, '*');
    });

    window.addEventListener('message', (event) => {
      const message = event.data as FrameMessage;
      if (message?.source !== 'frame') return;
      if (message.type === 'EDITOR_READY') console.log('[CF Studio] Frame ready');
    });
  }
  
  editorContainer.appendChild(editorFrame);

  initDrag(divider);
}

function changePreset(preset: UserSettings['layoutPreset']) {
  currentPreset = preset;
  currentRatio = PRESET_RATIOS[preset as Exclude<typeof preset, 'custom'>] || 0.5;
  
  document.querySelectorAll('.cf-studio-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLButtonElement).dataset.preset === preset);
  });

  applyDimension();
  
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'setSetting',
    target: 'background',
    source: 'content',
    payload: { key: 'layoutPreset', value: preset }
  };
  browser.runtime.sendMessage(message);
}

function applyDimension() {
  const shell = document.getElementById('cf-studio-shell');
  if (!shell) return;

  const paneSize = `${currentRatio * 100}vw`;
  const pageMargin = paneSize;

  const page = document.getElementById('page');
  if (!page) return;

  if (isPortraitMode) {
    shell.style.width = '100vw';
    shell.style.height = paneSize;
    page.style.marginRight = '0';
    page.style.marginBottom = pageMargin;
  } else {
    shell.style.width = paneSize;
    shell.style.height = '100vh';
    page.style.marginBottom = '0';
    page.style.marginRight = pageMargin;
  }
}

function initDrag(divider: HTMLElement) {
  let isDragging = false;

  const onStart = () => {
    isDragging = true;
    divider.classList.add('dragging');
    document.body.style.userSelect = 'none';
  };

  const onMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isPortraitMode) {
      currentRatio = 1.0 - (clientY / window.innerHeight);
    } else {
      currentRatio = 1.0 - (clientX / window.innerWidth);
    }
    
    currentRatio = Math.max(0.2, Math.min(0.8, currentRatio));
    
    if (currentPreset !== 'custom') {
      currentPreset = 'custom';
      document.querySelectorAll('.cf-studio-btn.active').forEach(btn => btn.classList.remove('active'));
    }

    applyDimension();
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.style.userSelect = '';

    const message1: Message = {
      id: crypto.randomUUID(),
      type: 'setSetting',
      target: 'background',
      source: 'content',
      payload: { key: 'layoutPreset', value: 'custom' }
    };
    
    const message2: Message = {
      id: crypto.randomUUID(),
      type: 'setSetting',
      target: 'background',
      source: 'content',
      payload: { key: 'layoutRatio', value: currentRatio }
    };
    
    browser.runtime.sendMessage(message1);
    browser.runtime.sendMessage(message2);
  };

  divider.addEventListener('mousedown', onStart);
  divider.addEventListener('touchstart', onStart as EventListener, { passive: true });
  
  document.addEventListener('mousemove', onMove as EventListener);
  document.addEventListener('touchmove', onMove as EventListener, { passive: true });
  
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

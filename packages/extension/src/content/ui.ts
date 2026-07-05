import browser from 'webextension-polyfill';
import type { FrameMessage, UserSettings, Message, SubmitMeta, Template } from '@cf-studio/shared';
import { mountTestcasePanel } from './testcase-panel';
import { mountNotesPanel } from './notes-panel';
import { mountTemplatesModal } from './templates-modal';
import { mountNotebookOverlay } from './notebook-overlay';

const CF_LANGUAGES: Record<number, string> = {
  103: "GNU G++23 14.2 (64 bit, msys2)",
  60: "GNU G++20 13.2.0 (64 bit, winlibs)",
  43: "GNU G++17 7.3.0",
  42: "GNU G++17 7.3.0 (64 bit, msys2)",
  50: "GNU G++14 6.4.0",
  11: "GNU G++11 5.1.0",
  44: "Clang++17 Diagnostics",
  34: "Clang++20 Diagnostics",
  61: "GNU G++20 13.2.0 (64 bit, winlibs)",
  1: "GNU G++",
  54: "PyPy 3.10",
  3: "Python 3.8.10",
  36: "PyPy 3.9",
  31: "Kotlin 1.7.20",
  48: "Kotlin 1.8.20",
  32: "Rust 1.70.0",
  49: "Rust 1.75.0",
};

let currentRatio = 0.5;
let currentPreset: UserSettings['layoutPreset'] = '50/50';
let isPortraitMode = false;
let editorFrame: HTMLIFrameElement | null = null;
let initialCodeState = '';
let currentContestId = 0;
let currentIndex = '';
let currentSubmitMeta: SubmitMeta;
let currentSettings: UserSettings;
let currentTemplates: Template[] = [];

const PRESET_RATIOS: Record<Exclude<UserSettings['layoutPreset'], 'custom'>, number> = {
  '50/50': 0.5,
  'statement-heavy': 0.65,
  'editor-heavy': 0.35,
};

export function mountWorkspace(initialCode: string, settings: UserSettings, contestId: number, index: string, submitMeta: SubmitMeta, templates?: Template[]) {
  initialCodeState = initialCode;
  currentContestId = contestId;
  currentIndex = index;
  currentSubmitMeta = submitMeta;
  currentSettings = settings;
  currentTemplates = templates ?? [];
  currentPreset = settings.layoutPreset;
  currentRatio = settings.layoutRatio || PRESET_RATIOS['50/50'];
  
  isPortraitMode = window.matchMedia('(orientation: portrait)').matches && window.innerWidth < 1024;

  injectStyles();
  ensureLayoutDOM();
  applyOrientation();
  applyDimension();

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeydown);

  document.body.classList.add('cf-studio-nav-collapsed');
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.second-level-menu') as HTMLElement;
    if (!nav) return;
    if (window.scrollY > 150 && window.scrollY > lastScrollY) {
      nav.classList.remove('expanded');
    } else if (window.scrollY < lastScrollY) {
      nav.classList.add('expanded');
    }
    lastScrollY = window.scrollY;
  }, { passive: true });
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
    applyOrientation();
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
      overflow: hidden;
    }
    #cf-studio-toolbar {
      height: 40px;
      background: #181825;
      display: flex;
      align-items: center;
      padding: 0 10px;
      gap: 8px;
      border-bottom: 1px solid #313244;
      flex-shrink: 0;
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
    .cf-studio-btn.icon-btn {
      padding: 6px 8px;
    }
    .cf-studio-select {
      background: #313244;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: monospace;
      font-size: 12px;
      outline: none;
    }
    #cf-studio-editor-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    #cf-studio-bottom-panel {
      height: 200px;
      border-top: 1px solid #313244;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    #cf-studio-tab-bar {
      display: flex;
      background: #181825;
      border-bottom: 1px solid #313244;
      flex-shrink: 0;
    }
    #cf-studio-tab-bar .tab-btn {
      background: transparent;
      color: #6c7086;
      border: none;
      padding: 6px 16px;
      cursor: pointer;
      font-size: 12px;
      font-family: monospace;
      border-bottom: 2px solid transparent;
    }
    #cf-studio-tab-bar .tab-btn.active {
      color: #89b4fa;
      border-bottom-color: #89b4fa;
    }
    #cf-studio-tab-content {
      flex: 1;
      overflow-y: auto;
    }
    #cf-studio-tab-content .tab-pane {
      display: none;
      height: 100%;
    }
    #cf-studio-tab-content .tab-pane.active {
      display: flex;
      flex-direction: column;
    }
    body.cf-studio-active #page {
      transition: margin 0.2s ease;
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add('cf-studio-active');
}

function ensureLayoutDOM() {
  if (document.getElementById('cf-studio-shell')) return;

  const shell = document.createElement('div');
  shell.id = 'cf-studio-shell';

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

  const templatesBtn = document.createElement('button');
  templatesBtn.className = 'cf-studio-btn icon-btn';
  templatesBtn.innerText = 'Templates';
  templatesBtn.addEventListener('click', () => {
    mountTemplatesModal();
  });
  toolbar.appendChild(templatesBtn);

  const notebookBtn = document.createElement('button');
  notebookBtn.className = 'cf-studio-btn icon-btn';
  notebookBtn.innerText = 'Notebook';
  notebookBtn.addEventListener('click', () => {
    mountNotebookOverlay();
  });
  toolbar.appendChild(notebookBtn);

  const langSelect = document.createElement('select');
  langSelect.id = 'cf-lang-select';
  langSelect.className = 'cf-studio-select';

  const allLangs = Object.entries(CF_LANGUAGES);
  const pinnedIds = currentSettings.pinnedLanguages;

  const pinnedLangs = allLangs.filter(([id]) => pinnedIds.includes(Number(id)));
  const otherLangs = allLangs.filter(([id]) => !pinnedIds.includes(Number(id)));

  if (pinnedLangs.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = 'Pinned';
    pinnedLangs.forEach(([id, name]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = name;
      optgroup.appendChild(opt);
    });
    langSelect.appendChild(optgroup);
  }

  const otherOptgroup = document.createElement('optgroup');
  otherOptgroup.label = 'Other';
  otherLangs.forEach(([id, name]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.innerText = name;
    otherOptgroup.appendChild(opt);
  });
  langSelect.appendChild(otherOptgroup);

  langSelect.value = String(currentSettings.pinnedLanguages[0] || 103);

  toolbar.appendChild(langSelect);

  const editorContainer = document.createElement('div');
  editorContainer.id = 'cf-studio-editor-container';

  const bottomPanel = document.createElement('div');
  bottomPanel.id = 'cf-studio-bottom-panel';

  const tabBar = document.createElement('div');
  tabBar.id = 'cf-studio-tab-bar';

  const testsTab = document.createElement('button');
  testsTab.className = 'tab-btn active';
  testsTab.dataset.tab = 'tests';
  testsTab.innerText = 'Tests';
  tabBar.appendChild(testsTab);

  const notesTab = document.createElement('button');
  notesTab.className = 'tab-btn';
  notesTab.dataset.tab = 'notes';
  notesTab.innerText = 'Notes';
  tabBar.appendChild(notesTab);

  bottomPanel.appendChild(tabBar);

  const tabContent = document.createElement('div');
  tabContent.id = 'cf-studio-tab-content';

  const testsPane = document.createElement('div');
  testsPane.id = 'cf-studio-testcases';
  testsPane.className = 'tab-pane active';

  const notesPane = document.createElement('div');
  notesPane.id = 'cf-studio-notes';
  notesPane.className = 'tab-pane';

  tabContent.appendChild(testsPane);
  tabContent.appendChild(notesPane);
  bottomPanel.appendChild(tabContent);

  tabBar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.tab-btn') as HTMLButtonElement;
    if (!btn) return;
    tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tabContent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('cf-studio-' + btn.dataset.tab);
    if (target) target.classList.add('active');
  });

  pane.appendChild(toolbar);
  pane.appendChild(editorContainer);
  pane.appendChild(bottomPanel);
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
      const msg: FrameMessage = { source: 'content', type: 'INIT_EDITOR', payload: { theme: 'dark', initialCode: initialCodeState, templates: currentTemplates } };
      editorFrame?.contentWindow?.postMessage(msg, '*');
    });

    window.addEventListener('message', (event) => {
      const message = event.data as FrameMessage;
      if (message?.source !== 'frame') return;
      if (message.type === 'EDITOR_READY') console.log('[CF Studio] Frame ready');
    });
  }
  
  editorContainer.appendChild(editorFrame);
  mountTestcasePanel(testsPane, currentContestId, currentIndex, currentSubmitMeta);
  mountNotesPanel(notesPane, currentContestId, currentIndex);

  initDrag(divider);
}

function applyOrientation() {
  const shell = document.getElementById('cf-studio-shell');
  if (!shell) return;
  shell.classList.remove('portrait', 'landscape');
  shell.classList.add(isPortraitMode ? 'portrait' : 'landscape');
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

  const paneSize = `${currentRatio * 100}v${isPortraitMode ? 'h' : 'w'}`;
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

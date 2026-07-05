import browser from 'webextension-polyfill';
import type { Message, MessageResult, ScrapeProblemData, RunCodeData, FrameMessage } from '@cf-studio/shared';
import { findFirstDivergence } from './diff';

interface TestCaseUIState {
  id: string;
  input: string;
  expectedOutput: string | null;
  source: 'sample' | 'custom';
  status: 'idle' | 'running' | 'done' | 'error';
  result?: RunCodeData;
  isExpanded: boolean;
}

let testCases: TestCaseUIState[] = [];
let panelContainer: HTMLElement | null = null;

export async function mountTestcasePanel(container: HTMLElement, contestId: number, index: string) {
  injectPanelStyles();
  
  panelContainer = container;
  panelContainer.innerHTML = `
    <div id="cf-tc-header">
      <span>Test Cases</span>
      <div id="cf-tc-actions">
        <button id="cf-tc-add" class="cf-studio-btn">+ Custom</button>
        <button id="cf-tc-run-all" class="cf-studio-btn primary">Run All</button>
      </div>
    </div>
    <div id="cf-tc-list"></div>
  `;
  
  await loadTestCases(contestId, index);
  
  document.getElementById('cf-tc-add')?.addEventListener('click', addCustomTestCase);
  document.getElementById('cf-tc-run-all')?.addEventListener('click', runAllTestCases);
  
  renderTestCases();
}

function injectPanelStyles() {
  if (document.getElementById('cf-tc-styles')) return;
  const style = document.createElement('style');
  style.id = 'cf-tc-styles';
  style.textContent = `
    #cf-studio-testcases {
      height: 300px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-top: 1px solid #313244;
      background: #181825;
      overflow: hidden;
    }
    #cf-tc-header {
      height: 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 12px;
      background: #11111b;
      border-bottom: 1px solid #313244;
      font-size: 12px;
      color: #cdd6f4;
      flex-shrink: 0;
    }
    #cf-tc-actions { display: flex; gap: 8px; }
    .cf-studio-btn.primary { background: #89b4fa; color: #1e1e2e; }
    .cf-studio-btn.primary:disabled { background: #313244; color: #6c7086; cursor: not-allowed; }
    
    #cf-tc-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .cf-tc-card {
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .cf-tc-card-header {
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      background: #181825;
      border-bottom: 1px solid #313244;
    }
    .cf-tc-card-title { font-size: 12px; color: #cdd6f4; display: flex; align-items: center; gap: 8px; }
    .cf-tc-status {
      width: 8px; height: 8px; border-radius: 50%;
      background: #6c7086;
    }
    .cf-tc-status.running { background: #f9e2af; animation: pulse 1s infinite; }
    .cf-tc-status.done { background: #a6e3a1; }
    .cf-tc-status.error { background: #f38ba8; }
    .cf-tc-status.mismatch { background: #fab387; }
    
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
    
    .cf-tc-card-actions { display: flex; gap: 6px; }
    .cf-tc-mini-btn {
      background: #313244; color: #cdd6f4; border: none; padding: 2px 6px; 
      border-radius: 3px; font-size: 11px; cursor: pointer;
    }
    .cf-tc-mini-btn:hover { background: #45475a; }
    
    .cf-tc-card-body {
      padding: 10px;
      display: none;
      flex-direction: column;
      gap: 10px;
    }
    .cf-tc-card.expanded .cf-tc-card-body { display: flex; }
    
    .cf-tc-section label {
      display: block; font-size: 11px; color: #6c7086; margin-bottom: 4px;
      text-transform: uppercase;
    }
    .cf-tc-section textarea, .cf-tc-section pre {
      width: 100%; box-sizing: border-box;
      background: #11111b; color: #cdd6f4; 
      border: 1px solid #313244; border-radius: 3px;
      padding: 6px; font-family: monospace; font-size: 12px;
      white-space: pre-wrap; word-break: break-all;
      margin-top: 0px;
    }
    .cf-tc-section textarea { resize: vertical; min-height: 40px; }
    .cf-tc-meta { font-size: 11px; color: #6c7086; margin-top: 4px; }
    .cf-diff-add { background: rgba(166, 227, 161, 0.2); color: #a6e3a1; display: block; }
    .cf-diff-del { background: rgba(243, 139, 168, 0.2); color: #f38ba8; display: block; }
  `;
  document.head.appendChild(style);
}

async function loadTestCases(contestId: number, index: string) {
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getProblemData',
    target: 'background',
    source: 'content',
    payload: { contestId, index }
  };
  
  try {
    const result = await browser.runtime.sendMessage(message) as MessageResult<ScrapeProblemData | null>;
    if (result.ok && result.data) {
      testCases = result.data.testCases.map((tc, i) => ({
        id: `sample-${i}`,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        source: 'sample',
        status: 'idle',
        isExpanded: i === 0
      }));
    }
  } catch (err) {
    console.error('[CF Studio] Failed to load test cases', err);
  }
}

function renderTestCases() {
  if (!panelContainer) return;
  const list = document.getElementById('cf-tc-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  testCases.forEach((tc, idx) => {
    const card = document.createElement('div');
    card.className = `cf-tc-card ${tc.isExpanded ? 'expanded' : ''}`;
    card.dataset.idx = idx.toString();
    
    let statusClass = tc.status;
    if (tc.status === 'done' && tc.expectedOutput !== null && tc.result?.stdout.trim() !== tc.expectedOutput.trim()) {
      statusClass = 'mismatch';
    }
    
    card.innerHTML = `
      <div class="cf-tc-card-header">
        <div class="cf-tc-card-title">
          <span class="cf-tc-status ${statusClass}"></span>
          <span>${tc.source === 'sample' ? `Sample ${idx + 1}` : `Custom ${idx - testCases.filter(t => t.source === 'sample').length + 1}`}</span>
          ${tc.status === 'done' && statusClass === 'mismatch' ? '<span style="color:#fab387;font-size:10px;">MISMATCH</span>' : ''}
        </div>
        <div class="cf-tc-card-actions">
          ${tc.source === 'custom' ? `<button class="cf-tc-mini-btn delete-btn">Delete</button>` : ''}
          <button class="cf-tc-mini-btn run-btn">Run</button>
        </div>
      </div>
      <div class="cf-tc-card-body">
        <div class="cf-tc-section">
          <label>Input</label>
          <textarea class="tc-input" ${tc.source === 'sample' ? 'readonly' : ''}>${tc.input}</textarea>
        </div>
        ${tc.expectedOutput !== null ? `
        <div class="cf-tc-section">
          <label>Expected Output</label>
          <pre>${escapeHtml(tc.expectedOutput)}</pre>
        </div>` : ''}
        ${tc.result ? renderResultSection(tc) : ''}
      </div>
    `;
    
    list.appendChild(card);
    
    card.querySelector('.cf-tc-card-header')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('cf-tc-mini-btn')) return;
      tc.isExpanded = !tc.isExpanded;
      card.classList.toggle('expanded');
    });
    
    card.querySelector('.run-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      runSingleTestCase(idx);
    });
    
    card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      testCases.splice(idx, 1);
      renderTestCases();
    });
    
    card.querySelector('.tc-input')?.addEventListener('input', (e) => {
      tc.input = (e.target as HTMLTextAreaElement).value;
    });
  });
}

function renderResultSection(tc: TestCaseUIState): string {
  if (!tc.result) return '';
  const out = tc.result.stdout.trim();
  const exp = tc.expectedOutput?.trim();
  const mismatch = exp !== null && exp !== undefined && out !== exp;
  
  let actualHtml = escapeHtml(out);
  if (mismatch && exp !== null && exp !== undefined) {
    const diff = findFirstDivergence(exp, out);
    if (diff) {
      actualHtml = `<span class="cf-diff-del">Exp: ${escapeHtml(diff.prefix + diff.oldDiff)}${diff.oldSuffix ? '...' : ''}</span><span class="cf-diff-add">Act: ${escapeHtml(diff.prefix + diff.newDiff)}${diff.newSuffix ? '...' : ''}</span>`;
    }
  }
  
  return `
    <div class="cf-tc-section">
      <label>Actual Output ${mismatch ? '<span style="color:#fab387">(Mismatch)</span>' : ''}</label>
      <pre>${actualHtml}</pre>
      <div class="cf-tc-meta">
        Exit: ${tc.result.exitCode} | Time: ${tc.result.wallTime.toFixed(3)}s
        ${tc.result.peakMemory ? ` | Mem: ${(tc.result.peakMemory / 1024 / 1024).toFixed(2)}MB` : ''}
      </div>
    </div>
    ${tc.result.stderr ? `
    <div class="cf-tc-section">
      <label>Stderr</label>
      <pre style="color: #f38ba8;">${escapeHtml(tc.result.stderr)}</pre>
    </div>` : ''}
  `;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addCustomTestCase() {
  testCases.push({
    id: `custom-${Date.now()}`,
    input: '',
    expectedOutput: null,
    source: 'custom',
    status: 'idle',
    isExpanded: true
  });
  renderTestCases();
  
  const list = document.getElementById('cf-tc-list');
  if (list) list.scrollTop = list.scrollHeight;
}

async function getCodeFromFrame(): Promise<string> {
  return new Promise((resolve) => {
    const iframe = document.getElementById('cf-studio-editor-container')?.querySelector('iframe');
    if (!iframe || !iframe.contentWindow) return resolve('');
    
    const handler = (event: MessageEvent) => {
      const msg = event.data as FrameMessage;
      if (msg?.source === 'frame' && msg.type === 'CODE_CHANGED') {
        window.removeEventListener('message', handler);
        resolve(msg.payload.code);
      }
    };
    window.addEventListener('message', handler);
    
    const msg: FrameMessage = { source: 'content', type: 'REQUEST_CODE', payload: {} };
    iframe.contentWindow.postMessage(msg, '*');
    
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve('');
    }, 2000);
  });
}

async function runSingleTestCase(idx: number) {
  const code = await getCodeFromFrame();
  if (!code) return;
  
  const tc = testCases[idx];
  tc.status = 'running';
  tc.result = undefined;
  renderTestCases();
  
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'runCode',
    target: 'background',
    source: 'content',
    payload: { code, stdin: tc.input }
  };
  
  try {
    const result = await browser.runtime.sendMessage(message) as MessageResult<RunCodeData>;
    if (result.ok && result.data) {
      tc.status = 'done';
      tc.result = result.data;
    } else {
      tc.status = 'error';
    }
  } catch (err) {
    tc.status = 'error';
  }
  renderTestCases();
}

async function runAllTestCases() {
  const runAllBtn = document.getElementById('cf-tc-run-all') as HTMLButtonElement;
  if (runAllBtn) runAllBtn.disabled = true;
  
  const code = await getCodeFromFrame();
  if (!code) {
    if (runAllBtn) runAllBtn.disabled = false;
    return;
  }
  
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    tc.status = 'running';
    tc.result = undefined;
    renderTestCases();
    
    const message: Message = {
      id: crypto.randomUUID(),
      type: 'runCode',
      target: 'background',
      source: 'content',
      payload: { code, stdin: tc.input }
    };
    
    try {
      const result = await browser.runtime.sendMessage(message) as MessageResult<RunCodeData>;
      if (result.ok && result.data) {
        tc.status = 'done';
        tc.result = result.data;
      } else {
        tc.status = 'error';
      }
    } catch (err) {
      tc.status = 'error';
    }
    renderTestCases();
  }
  
  if (runAllBtn) runAllBtn.disabled = false;
}

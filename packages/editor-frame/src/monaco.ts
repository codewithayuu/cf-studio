import * as monaco from 'monaco-editor';
import type { Template } from '@cf-studio/shared';
import { stlSuggestions } from './stl-db';

let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let activeTemplates: Template[] = [];
let tsWorker: Worker | null = null;
let localSymbols: { name: string; type: string }[] = [];
let pendingTsRequest = 0;

export function initMonaco(container: HTMLElement, initialCode: string, theme: 'dark' | 'light', templates: Template[]) {
  activeTemplates = templates || [];

  monaco.editor.defineTheme('cf-studio-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e2e',
      'editor.lineHighlightBackground': '#313244',
      'editorLineNumber.foreground': '#6c7086',
      'editorLineNumber.activeForeground': '#cdd6f4',
    }
  });

  monaco.editor.defineTheme('cf-studio-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    }
  });

  editor = monaco.editor.create(container, {
    value: initialCode,
    language: 'cpp',
    theme: theme === 'dark' ? 'cf-studio-dark' : 'cf-studio-light',
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 4,
  });

  initSymbolWorker();
  registerCompletionProviders(editor);

  return editor;
}

export function updateTemplates(templates: Template[]) {
  activeTemplates = templates || [];
}

function initSymbolWorker() {
  tsWorker = new Worker(new URL('./tree-sitter.worker.ts', import.meta.url), { type: 'module' });
  
  tsWorker.onmessage = (e: MessageEvent<{ requestId: number; symbols: { name: string; type: string }[] }>) => {
    if (e.data.requestId === pendingTsRequest) {
      localSymbols = e.data.symbols;
    }
  };

  editor?.onDidChangeModelContent(() => {
    if (!tsWorker) return;
    pendingTsRequest++;
    tsWorker.postMessage({ code: editor!.getValue(), requestId: pendingTsRequest });
  });
  
  pendingTsRequest++;
  tsWorker.postMessage({ code: editor!.getValue(), requestId: pendingTsRequest });
}

function registerCompletionProviders(editor: monaco.editor.IStandaloneCodeEditor) {
  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.'],
    provideCompletionItems: () => {
      return { suggestions: stlSuggestions };
    }
  });

  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['', ' '],
    provideCompletionItems: () => {
      const suggestions = localSymbols.map(sym => ({
        label: sym.name,
        kind: sym.type === 'function' ? monaco.languages.CompletionItemKind.Function : monaco.languages.CompletionItemKind.Variable,
        insertText: sym.name,
        detail: `Local ${sym.type}`
      }));
      return { suggestions };
    }
  });

  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['/'],
    provideCompletionItems: (model, position) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });
      
      const slashIdx = textUntilPosition.lastIndexOf('/');
      if (slashIdx === -1) return { suggestions: [] };

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: slashIdx + 1,
        endColumn: position.column
      };

      return {
        suggestions: activeTemplates.map(t => ({
          label: t.trigger,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: t.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: t.name,
          documentation: t.body,
          range: range
        }))
      };
    }
  });
}

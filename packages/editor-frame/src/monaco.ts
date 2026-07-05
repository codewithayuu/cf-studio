import * as monaco from "monaco-editor";
import type { Template } from "@cf-studio/shared";

let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let completionDisposable: monaco.IDisposable | null = null;

export function initMonaco(
  container: HTMLElement,
  initialCode: string,
  theme: "dark" | "light",
) {
  monaco.editor.defineTheme("cf-studio-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e2e",
      "editor.lineHighlightBackground": "#313244",
      "editorLineNumber.foreground": "#6c7086",
      "editorLineNumber.activeForeground": "#cdd6f4",
    },
  });

  monaco.editor.defineTheme("cf-studio-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
    },
  });

  editor = monaco.editor.create(container, {
    value: initialCode,
    language: "cpp",
    theme: theme === "dark" ? "cf-studio-dark" : "cf-studio-light",
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 4,
  });

  return editor;
}

export function updateTemplates(templates: Template[]) {
  if (completionDisposable) {
    completionDisposable.dispose();
  }

  completionDisposable = monaco.languages.registerCompletionItemProvider("cpp", {
    triggerCharacters: ["/"],
    provideCompletionItems: (model, position) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const match = textUntilPosition.match(/\/\s*(\w*)$/);
      if (!match) return { suggestions: [] };

      const prefix = match[1].toLowerCase();
      const suggestions = templates
        .filter((t) => t.trigger.toLowerCase().startsWith(prefix))
        .map((t) => ({
          label: `/${t.trigger}`,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: t.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: t.name,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: textUntilPosition.search(/\/\s*\w*$/) + 1,
            endColumn: position.column,
          },
        }));

      return { suggestions };
    },
  });
}

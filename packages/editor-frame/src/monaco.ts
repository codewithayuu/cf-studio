import * as monaco from "monaco-editor";

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

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

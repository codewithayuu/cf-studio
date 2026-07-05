import * as monaco from 'monaco-editor';

export const stlSuggestions: monaco.languages.CompletionItem[] = [
  {
    label: 'sort',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: 'sort(${1:begin}, ${2:end})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'STL Algorithm',
    documentation: 'Sorts elements in the range [first, last) in ascending order.'
  },
  {
    label: 'lower_bound',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: 'lower_bound(${1:begin}, ${2:end}, ${3:value})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'STL Algorithm',
    documentation: 'Returns an iterator pointing to the first element in the range [first,last) which does not compare less than val.'
  },
  {
    label: 'upper_bound',
    kind: monaco.languages.CompletionItemKind.Method,
    insertText: 'upper_bound(${1:begin}, ${2:end}, ${3:value})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'STL Algorithm',
    documentation: 'Returns an iterator pointing to the first element in the range [first,last) which compares greater than val.'
  },
  {
    label: 'vector',
    kind: monaco.languages.CompletionItemKind.Class,
    insertText: 'vector<${1:type}> ${2:name};',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'STL Container',
    documentation: 'A sequence container that encapsulates dynamic size arrays.'
  },
  {
    label: 'map',
    kind: monaco.languages.CompletionItemKind.Class,
    insertText: 'map<${1:key}, ${2:value}> ${3:name};',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'STL Container',
    documentation: 'Associative container that contains key-value pairs with unique keys.'
  },
  {
    label: 'set',
    kind: monaco.languages.CompletionItemKind.Class,
    insertText: 'set<${1:type}> ${2:name};',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'STL Container',
    documentation: 'Associative container that contains a sorted set of unique objects.'
  },
  {
    label: '__builtin_popcount',
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: '__builtin_popcount(${1:x})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'GCC Builtin',
    documentation: 'Returns the number of 1-bits in x.'
  }
];

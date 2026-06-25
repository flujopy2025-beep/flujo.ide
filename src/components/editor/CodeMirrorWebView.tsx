import React, { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { useTheme } from '../../hooks/useTheme';

// Inline the editor HTML as a string for the WebView.
// NOTE: CodeMirror modules are loaded from esm.sh CDN at runtime. This means
// the editor requires network access on first load. For offline support, the
// CodeMirror packages would need to be bundled as local assets served via a
// local HTTP server or inlined as a pre-built bundle.
const EDITOR_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Flujo IDE Editor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; background: #1e1e1e; font-family: monospace; }
    #editor { height: 100%; width: 100%; }
    .cm-editor { height: 100%; font-size: 14px; }
    .cm-editor .cm-scroller { overflow: auto; }
    .cm-focused { outline: none !important; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script type="module">
    import { EditorView, basicSetup } from 'https://esm.sh/@codemirror/basic-setup@0.20.0';
    import { EditorState } from 'https://esm.sh/@codemirror/state@6.4.1';
    import { javascript } from 'https://esm.sh/@codemirror/lang-javascript@6.2.2';
    import { python } from 'https://esm.sh/@codemirror/lang-python@6.1.6';
    import { html } from 'https://esm.sh/@codemirror/lang-html@6.4.9';
    import { css } from 'https://esm.sh/@codemirror/lang-css@6.3.0';
    import { json } from 'https://esm.sh/@codemirror/lang-json@6.0.1';
    import { markdown } from 'https://esm.sh/@codemirror/lang-markdown@6.3.0';
    import { oneDark } from 'https://esm.sh/@codemirror/theme-one-dark@6.1.2';
    import { keymap } from 'https://esm.sh/@codemirror/view@6.33.1';
    import { indentWithTab, undo as undoCmd, redo as redoCmd } from 'https://esm.sh/@codemirror/commands@6.6.0';
    import { indentUnit } from 'https://esm.sh/@codemirror/language@6.10.2';
    import { search } from 'https://esm.sh/@codemirror/search@6.5.6';

    let editor = null;
    let currentLanguage = 'javascript';

    function getLanguageExtension(lang) {
      switch (lang) {
        case 'javascript': return javascript({ jsx: true });
        case 'typescript': return javascript({ jsx: true, typescript: true });
        case 'python': return python();
        case 'html': return html();
        case 'css': return css();
        case 'json': return json();
        case 'markdown': return markdown();
        default: return [];
      }
    }

    function createEditor(content = '', language = 'javascript') {
      currentLanguage = language;
      const langExtension = getLanguageExtension(language);
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          sendToRN({ type: 'contentChanged', content: update.state.doc.toString() });
        }
      });
      const state = EditorState.create({
        doc: content,
        extensions: [
          basicSetup, oneDark, langExtension,
          keymap.of([indentWithTab]),
          indentUnit.of('  '),
          search(), updateListener,
          EditorView.lineWrapping,
        ],
      });
      if (editor) editor.destroy();
      editor = new EditorView({ state, parent: document.getElementById('editor') });
      sendToRN({ type: 'editorReady' });
    }

    function setContent(content, language) {
      if (!editor || (language && language !== currentLanguage)) {
        createEditor(content, language || currentLanguage);
        return;
      }
      const currentContent = editor.state.doc.toString();
      if (currentContent !== content) {
        editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: content } });
      }
    }

    function getContent() { return editor ? editor.state.doc.toString() : ''; }

    function sendToRN(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }

    window.handleEditorMessage = function(data) {
      switch (data.type) {
        case 'setContent': setContent(data.content || '', data.language); break;
        case 'getContent': sendToRN({ type: 'content', content: getContent() }); break;
        case 'setLanguage':
          if (data.language !== currentLanguage) createEditor(getContent(), data.language);
          break;
        case 'undo': if (editor) undoCmd(editor); break;
        case 'redo': if (editor) redoCmd(editor); break;
        case 'insertText':
          if (editor) {
            const cursor = editor.state.selection.main.head;
            editor.dispatch({ changes: { from: cursor, to: cursor, insert: data.text } });
            editor.focus();
          }
          break;
        default: break;
      }
    };

    function handleMessage(event) {
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      window.handleEditorMessage(data);
    }

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    createEditor('// Welcome to Flujo IDE\\n// Open a file to start editing\\n', 'javascript');
  <\/script>
</body>
</html>`;

export interface CodeMirrorWebViewHandle {
  setContent: (content: string, language?: string) => void;
  getContent: () => void;
  setLanguage: (language: string) => void;
  undo: () => void;
  redo: () => void;
  insertText: (text: string) => void;
}

interface CodeMirrorWebViewProps {
  onContentChange?: (content: string) => void;
  onEditorReady?: () => void;
  initialContent?: string;
  language?: string;
  showQuickInsert?: boolean;
}

const QUICK_INSERT_KEYS = [
  'Tab', '{', '}', '(', ')', '[', ']', ';', ':', "'", '"', '<', '>', '/', '=', '!', '&', '|', '.',
];

export const CodeMirrorWebView = forwardRef<CodeMirrorWebViewHandle, CodeMirrorWebViewProps>(
  ({ onContentChange, onEditorReady, initialContent, language, showQuickInsert = true }, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webViewRef = useRef<any>(null);
    const { theme } = useTheme();
    const isReady = useRef(false);
    const pendingContent = useRef<{ content: string; language?: string } | null>(null);

    const injectMessage = useCallback((message: Record<string, unknown>) => {
      const script = `window.handleEditorMessage(${JSON.stringify(message)}); true;`;
      webViewRef.current?.injectJavaScript(script);
    }, []);

    useImperativeHandle(ref, () => ({
      setContent: (content: string, lang?: string) => {
        if (isReady.current) {
          injectMessage({ type: 'setContent', content, language: lang });
        } else {
          pendingContent.current = { content, language: lang };
        }
      },
      getContent: () => {
        injectMessage({ type: 'getContent' });
      },
      setLanguage: (lang: string) => {
        injectMessage({ type: 'setLanguage', language: lang });
      },
      undo: () => {
        injectMessage({ type: 'undo' });
      },
      redo: () => {
        injectMessage({ type: 'redo' });
      },
      insertText: (text: string) => {
        injectMessage({ type: 'insertText', text });
      },
    }));

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        switch (data.type) {
          case 'editorReady':
            isReady.current = true;
            if (pendingContent.current) {
              injectMessage({
                type: 'setContent',
                content: pendingContent.current.content,
                language: pendingContent.current.language,
              });
              pendingContent.current = null;
            } else if (initialContent !== undefined) {
              injectMessage({
                type: 'setContent',
                content: initialContent,
                language: language,
              });
            }
            onEditorReady?.();
            break;
          case 'contentChanged':
            onContentChange?.(data.content);
            break;
          case 'content':
            // Response to getContent request - could be handled via callback
            break;
        }
      } catch {
        // Ignore parse errors
      }
    }, [onContentChange, onEditorReady, initialContent, language, injectMessage]);

    useEffect(() => {
      if (isReady.current && initialContent !== undefined) {
        injectMessage({ type: 'setContent', content: initialContent, language });
      }
    }, [initialContent, language, injectMessage]);

    const handleQuickInsert = useCallback((key: string) => {
      const text = key === 'Tab' ? '\t' : key;
      injectMessage({ type: 'insertText', text });
    }, [injectMessage]);

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.editorBackground }]}>
        <WebView
          ref={webViewRef}
          source={{ html: EDITOR_HTML }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess={true}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
        {showQuickInsert && (
          <View style={[styles.quickInsertBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.quickInsertContent}
            >
              {QUICK_INSERT_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.quickInsertKey, { backgroundColor: theme.colors.border }]}
                  onPress={() => handleQuickInsert(key)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.quickInsertKeyText, { color: theme.colors.text }]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
);

CodeMirrorWebView.displayName = 'CodeMirrorWebView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  quickInsertBar: {
    height: 40,
    borderTopWidth: 1,
    justifyContent: 'center',
  },
  quickInsertContent: {
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
  },
  quickInsertKey: {
    minWidth: 34,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickInsertKeyText: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
});

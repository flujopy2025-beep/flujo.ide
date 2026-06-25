import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useEditor } from '../../src/contexts/EditorContext';
import { CodeMirrorWebView, CodeMirrorWebViewHandle } from '../../src/components/editor/CodeMirrorWebView';
import { TabBar } from '../../src/components/editor/TabBar';

export default function EditorScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { tabs, activeTab, switchTab, closeTab, updateContent, saveFile, getTabContent } = useEditor();
  const editorRef = useRef<CodeMirrorWebViewHandle>(null);

  const handleContentChange = useCallback((content: string) => {
    if (activeTab) {
      updateContent(activeTab.id, content);
    }
  }, [activeTab, updateContent]);

  const handleSwitchTab = useCallback((tabId: string) => {
    switchTab(tabId);
    const content = getTabContent(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      editorRef.current?.setContent(content, tab.language);
    }
  }, [switchTab, getTabContent, tabs]);

  const handleUndo = useCallback(() => {
    editorRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.redo();
  }, []);

  const handleSave = useCallback(async () => {
    if (activeTab) {
      await saveFile(activeTab.id);
    }
  }, [activeTab, saveFile]);

  const currentContent = activeTab ? getTabContent(activeTab.id) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Bar */}
      <View style={styles.tabBarContainer}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTab?.id || null}
          onSwitchTab={handleSwitchTab}
          onCloseTab={closeTab}
        />
      </View>

      {/* Editor Area */}
      {activeTab ? (
        <View style={styles.editorContainer}>
          <CodeMirrorWebView
            ref={editorRef}
            initialContent={currentContent}
            language={activeTab.language}
            onContentChange={handleContentChange}
          />
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.editorBackground }]}>
          <Ionicons name="code-slash" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Open a file to start editing
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Go to Files tab to browse and open files
          </Text>
        </View>
      )}

      {/* Toolbar */}
      {activeTab && (
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
            <Ionicons name="arrow-undo" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleRedo}>
            <Ionicons name="arrow-redo" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.toolbarSpacer} />
          <View style={styles.statusIndicator}>
            {activeTab.isDirty && (
              <View style={[styles.dirtyDot, { backgroundColor: colors.warning }]} />
            )}
            <Text style={[styles.languageLabel, { color: colors.textMuted }]}>
              {activeTab.language}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: activeTab.isDirty ? colors.primary : colors.border },
            ]}
            onPress={handleSave}
            disabled={!activeTab.isDirty}
          >
            <Ionicons name="save" size={14} color="#ffffff" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 44,
  },
  tabBarContainer: {
    zIndex: 1,
  },
  editorContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  toolButton: {
    padding: 8,
    marginRight: 4,
  },
  toolbarSpacer: {
    flex: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  languageLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Tab } from '../types';
import { FileService } from '../services/FileService';
import { detectLanguage } from '../utils/languageDetection';

export interface EditorContextValue {
  tabs: Tab[];
  activeTab: Tab | null;
  openFile: (filePath: string, fileName: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateContent: (tabId: string, content: string) => void;
  saveFile: (tabId: string) => Promise<void>;
  getTabContent: (tabId: string) => string;
}

interface TabState extends Tab {
  content: string;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [tabStates, setTabStates] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const tabs = useMemo<Tab[]>(
    () =>
      tabStates.map(({ content: _content, ...tab }) => tab),
    [tabStates]
  );

  const activeTab = useMemo<Tab | null>(
    () => tabs.find((t) => t.id === activeTabId) || null,
    [tabs, activeTabId]
  );

  const openFile = useCallback(async (filePath: string, fileName: string) => {
    // Check if the file is already open by examining current state.
    // We use a ref-based check first to avoid duplicate async file reads.
    let alreadyOpen = false;

    setTabStates((prev) => {
      const existing = prev.find((t) => t.filePath === filePath);
      if (existing) {
        alreadyOpen = true;
        setActiveTabId(existing.id);
        return prev.map((t) => ({
          ...t,
          isActive: t.id === existing.id,
        }));
      }
      return prev;
    });

    // If the tab was already open, we activated it above - nothing else to do
    if (alreadyOpen) return;

    // Read file content
    let content = '';
    try {
      content = await FileService.readFile(filePath);
    } catch {
      content = '';
    }

    const language = detectLanguage(fileName);
    const id = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newTab: TabState = {
      id,
      fileId: filePath,
      fileName,
      filePath,
      language,
      isActive: true,
      isDirty: false,
      content,
    };

    // Use functional update to avoid stale state - check again in case
    // a concurrent call opened the same file while we were reading it
    setTabStates((prev) => {
      const existing = prev.find((t) => t.filePath === filePath);
      if (existing) {
        // Another call opened the same file concurrently, just activate it
        setActiveTabId(existing.id);
        return prev.map((t) => ({ ...t, isActive: t.id === existing.id }));
      }
      return [
        ...prev.map((t) => ({ ...t, isActive: false })),
        newTab,
      ];
    });
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabStates((prev) => {
      const index = prev.findIndex((t) => t.id === tabId);
      if (index === -1) return prev;

      const newTabs = prev.filter((t) => t.id !== tabId);
      if (newTabs.length === 0) {
        setActiveTabId(null);
        return [];
      }

      // If we're closing the active tab, activate an adjacent one
      const closedTab = prev[index];
      if (closedTab.isActive) {
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        const newActiveId = newTabs[newActiveIndex].id;
        setActiveTabId(newActiveId);
        return newTabs.map((t) => ({ ...t, isActive: t.id === newActiveId }));
      }

      return newTabs;
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setTabStates((prev) =>
      prev.map((t) => ({ ...t, isActive: t.id === tabId }))
    );
  }, []);

  const updateContent = useCallback((tabId: string, content: string) => {
    setTabStates((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, content, isDirty: true } : t
      )
    );
  }, []);

  const saveFile = useCallback(async (tabId: string) => {
    // Read the tab from current state using a ref-like pattern
    let tabToSave: TabState | undefined;
    setTabStates((prev) => {
      tabToSave = prev.find((t) => t.id === tabId);
      return prev;
    });
    if (!tabToSave) return;

    await FileService.writeFile(tabToSave.filePath, tabToSave.content);
    setTabStates((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t))
    );
  }, []);

  const getTabContent = useCallback(
    (tabId: string): string => {
      const tab = tabStates.find((t) => t.id === tabId);
      return tab?.content || '';
    },
    [tabStates]
  );

  const value = useMemo<EditorContextValue>(
    () => ({
      tabs,
      activeTab,
      openFile,
      closeTab,
      switchTab,
      updateContent,
      saveFile,
      getTabContent,
    }),
    [tabs, activeTab, openFile, closeTab, switchTab, updateContent, saveFile, getTabContent]
  );

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

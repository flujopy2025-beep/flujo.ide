import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Tab } from '../../types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function TabBar({ tabs, activeTabId, onSwitchTab, onCloseTab }: TabBarProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (tabs.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.editorBackground : colors.surface,
                  borderBottomColor: isActive ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => onSwitchTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.text : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {tab.isDirty ? '\u2022 ' : ''}{tab.fileName}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={isActive ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    borderBottomWidth: 1,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 2,
    minWidth: 80,
    maxWidth: 160,
  },
  tabText: {
    fontSize: 12,
    flex: 1,
    marginRight: 6,
  },
  closeButton: {
    padding: 2,
  },
});

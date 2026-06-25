/**
 * Chat Tab Screen - AI SEO assistant chat interface with model selector,
 * scrollable message list, and input at bottom.
 */

import React, { useContext, useRef, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { ChatContext } from '../../src/contexts/ChatContext';
import { SettingsContext } from '../../src/contexts/SettingsContext';
import ChatMessage from '../../src/components/chat/ChatMessage';
import ChatInput from '../../src/components/chat/ChatInput';
import ModelSelector from '../../src/components/chat/ModelSelector';
import { Message } from '../../src/types';

export default function ChatScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
  } = useContext(ChatContext);
  const { settings } = useContext(SettingsContext);
  const flatListRef = useRef<FlatList<Message>>(null);

  const hasConfiguredProvider = settings.llmProviders.some((p) => p.apiKey);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
      // Scroll to bottom after send
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [sendMessage]
  );

  const renderEmptyState = () => {
    if (!hasConfiguredProvider) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="key-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No API Keys Configured
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add your OpenAI, Claude, Gemini, or OpenRouter API key in Settings to start chatting.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          SEO Assistant
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Ask Flujo about SEO best practices, get recommendations for improving your search rankings, or discuss your audit results.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>AI Chat</Text>
        </View>
        {messages.length > 0 && (
          <Pressable onPress={clearConversation} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Model Selector */}
      <ModelSelector />

      {/* Error Banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '20' }]}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={2}>
            {error}
          </Text>
        </View>
      )}

      {/* Messages List */}
      {messages.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatMessage message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={[styles.loadingBar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.loadingText, { color: colors.primary }]}>
            Generating response...
          </Text>
        </View>
      )}

      {/* Chat Input */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  clearButton: {
    padding: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  messageList: {
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

/**
 * ChatInput - Text input with send button and optional file context attachment.
 * Features auto-growing textarea style.
 */

import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  hasFileContext?: boolean;
  onAttachFile?: () => void;
}

export default function ChatInput({ onSend, isLoading, hasFileContext, onAttachFile }: ChatInputProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && !isLoading) {
      onSend(trimmed);
      setText('');
      setInputHeight(40);
    }
  }, [text, isLoading, onSend]);

  const handleContentSizeChange = useCallback(
    (event: { nativeEvent: { contentSize: { height: number } } }) => {
      const newHeight = Math.min(Math.max(40, event.nativeEvent.contentSize.height), 120);
      setInputHeight(newHeight);
    },
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {hasFileContext && (
        <View style={[styles.contextBadge, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="document-text" size={12} color={colors.primary} />
          <Text style={[styles.contextText, { color: colors.primary }]}>File attached</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        {onAttachFile && (
          <Pressable
            style={[styles.attachButton, { backgroundColor: colors.surfaceHover }]}
            onPress={onAttachFile}
          >
            <Ionicons name="attach" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
              height: inputHeight,
            },
          ]}
          placeholder="Ask Flujo IDE..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          onContentSizeChange={handleContentSizeChange}
          editable={!isLoading}
          returnKeyType="default"
        />
        <Pressable
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim() && !isLoading ? colors.primary : colors.surfaceHover,
            },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || isLoading}
        >
          {isLoading ? (
            <Ionicons name="hourglass" size={18} color={colors.textMuted} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? '#ffffff' : colors.textMuted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  contextText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 120,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

/**
 * ChatMessage - Renders a single chat message with basic markdown support.
 * User messages are right-aligned, AI messages left-aligned with avatar.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
}

interface ParsedSegment {
  type: 'text' | 'code' | 'codeBlock' | 'bold' | 'italic' | 'listItem';
  content: string;
  language?: string;
}

function parseMarkdown(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      segments.push({
        type: 'codeBlock',
        content: codeLines.join('\n'),
        language: language || undefined,
      });
      continue;
    }

    // List items
    if (/^[-*]\s/.test(line)) {
      segments.push({ type: 'listItem', content: line.replace(/^[-*]\s/, '') });
      i++;
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s/.test(line)) {
      segments.push({ type: 'listItem', content: line });
      i++;
      continue;
    }

    // Process inline formatting
    if (line.length > 0) {
      parseInlineSegments(line, segments);
    }

    if (line.length === 0 && segments.length > 0) {
      segments.push({ type: 'text', content: '\n' });
    }

    i++;
  }

  return segments;
}

function parseInlineSegments(line: string, segments: ParsedSegment[]): void {
  // Simple inline parser for bold, italic, inline code
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: line.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({ type: 'code', content: token.slice(1, -1) });
    } else if (token.startsWith('**') && token.endsWith('**')) {
      segments.push({ type: 'bold', content: token.slice(2, -2) });
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      segments.push({ type: 'italic', content: token.slice(1, -1) });
    }

    lastIndex = match.index + token.length;
  }

  // Remaining text
  if (lastIndex < line.length) {
    segments.push({ type: 'text', content: line.slice(lastIndex) });
  }

  // Add newline
  segments.push({ type: 'text', content: '\n' });
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

  const segments = useMemo(() => parseMarkdown(message.content), [message.content]);

  const renderSegment = (segment: ParsedSegment, index: number) => {
    switch (segment.type) {
      case 'codeBlock':
        return (
          <View
            key={index}
            style={[styles.codeBlock, { backgroundColor: colors.editorBackground }]}
          >
            {segment.language && (
              <Text style={[styles.codeLanguage, { color: colors.textMuted }]}>
                {segment.language}
              </Text>
            )}
            <Text style={[styles.codeText, { color: colors.text }]}>
              {segment.content}
            </Text>
          </View>
        );
      case 'code':
        return (
          <Text
            key={index}
            style={[styles.inlineCode, { backgroundColor: colors.editorBackground, color: colors.accent }]}
          >
            {segment.content}
          </Text>
        );
      case 'bold':
        return (
          <Text key={index} style={styles.boldText}>
            {segment.content}
          </Text>
        );
      case 'italic':
        return (
          <Text key={index} style={styles.italicText}>
            {segment.content}
          </Text>
        );
      case 'listItem':
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.primary }]}>{'\u2022'}</Text>
            <Text style={[styles.listText, { color: isUser ? '#ffffff' : colors.text }]}>
              {segment.content}
            </Text>
          </View>
        );
      default:
        return (
          <Text key={index} style={{ color: isUser ? '#ffffff' : colors.text }}>
            {segment.content}
          </Text>
        );
    }
  };

  // Render tool call message
  if (hasToolCalls) {
    return (
      <View style={[styles.container, styles.aiContainer]}>
        <View style={[styles.avatar, { backgroundColor: colors.warning }]}>
          <Text style={styles.avatarText}>T</Text>
        </View>
        <View style={[styles.bubble, styles.toolBubble, { backgroundColor: colors.surface, borderColor: colors.warning + '60' }]}>
          <Text style={[styles.toolLabel, { color: colors.warning }]}>Tool Calls</Text>
          {message.toolCalls!.map((tc) => (
            <View key={tc.id} style={[styles.toolCallItem, { borderColor: colors.border }]}>
              <Text style={[styles.toolCallName, { color: colors.primary }]}>{tc.name}</Text>
              {Object.keys(tc.arguments).length > 0 && (
                <Text style={[styles.toolCallArgs, { color: colors.textMuted }]}>
                  {JSON.stringify(tc.arguments, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Render tool result message
  if (isTool && message.toolResult) {
    const isError = message.toolResult.isError;
    return (
      <View style={[styles.container, styles.aiContainer]}>
        <View style={[styles.avatar, { backgroundColor: isError ? colors.error : colors.success }]}>
          <Text style={styles.avatarText}>{isError ? '!' : '\u2713'}</Text>
        </View>
        <View
          style={[
            styles.bubble,
            styles.toolBubble,
            {
              backgroundColor: colors.surface,
              borderColor: isError ? colors.error + '60' : colors.success + '60',
            },
          ]}
        >
          <Text style={[styles.toolLabel, { color: isError ? colors.error : colors.success }]}>
            {isError ? 'Tool Error' : 'Tool Result'}: {message.toolResult.toolName}
          </Text>
          <Text style={[styles.toolResultContent, { color: colors.text }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.aiBubble, { backgroundColor: colors.surface }],
        ]}
      >
        <Text style={[styles.messageText, { color: isUser ? '#ffffff' : colors.text }]}>
          {segments.map((segment, index) => renderSegment(segment, index))}
        </Text>
        {message.model && (
          <Text style={[styles.meta, { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>
            {message.model}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 10,
    marginTop: 4,
  },
  codeBlock: {
    borderRadius: 6,
    padding: 10,
    marginVertical: 6,
  },
  codeLanguage: {
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bullet: {
    marginRight: 6,
    fontSize: 14,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  toolBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolCallItem: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 4,
  },
  toolCallName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  toolCallArgs: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
    lineHeight: 16,
  },
  toolResultContent: {
    fontSize: 13,
    lineHeight: 18,
  },
});

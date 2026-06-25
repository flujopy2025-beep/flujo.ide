/**
 * AddServerModal - Modal form for adding/editing an MCP server configuration.
 * Allows setting name, URL (SSE transport), optional headers, and description.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { MCPServerConfig } from '../../services/mcp';

interface AddServerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: MCPServerConfig) => void;
  editConfig?: MCPServerConfig | null;
}

export function AddServerModal({
  visible,
  onClose,
  onSave,
  editConfig,
}: AddServerModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [headersText, setHeadersText] = useState('');
  const [autoConnect, setAutoConnect] = useState(false);

  // Reset form when modal opens or editConfig changes
  useEffect(() => {
    if (editConfig) {
      setName(editConfig.name);
      setUrl(editConfig.url || '');
      setDescription(editConfig.description || '');
      setAutoConnect(editConfig.autoConnect || false);
      if (editConfig.headers && Object.keys(editConfig.headers).length > 0) {
        setHeadersText(
          Object.entries(editConfig.headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
        );
      } else {
        setHeadersText('');
      }
    } else {
      setName('');
      setUrl('');
      setDescription('');
      setHeadersText('');
      setAutoConnect(false);
    }
  }, [editConfig, visible]);

  const parseHeaders = (text: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!text.trim()) return headers;

    const lines = text.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key && value) {
          headers[key] = value;
        }
      }
    }
    return headers;
  };

  const handleSave = () => {
    if (!name.trim() || !url.trim()) return;

    const config: MCPServerConfig = {
      id: editConfig?.id || `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      transport: 'sse',
      url: url.trim(),
      description: description.trim() || undefined,
      headers: parseHeaders(headersText),
      autoConnect,
    };

    onSave(config);
    onClose();
  };

  const isValid = name.trim().length > 0 && url.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editConfig ? 'Edit Server' : 'Add MCP Server'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="My MCP Server"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>URL (SSE) *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                value={url}
                onChangeText={setUrl}
                placeholder="http://localhost:3000/sse"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                SSE endpoint URL for the MCP server
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="What this server provides..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Headers (one per line, Key: Value)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                value={headersText}
                onChangeText={setHeadersText}
                placeholder={'Authorization: Bearer token\nX-Custom: value'}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.switchField}>
              <View style={styles.switchLabel}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Auto-connect on startup
                </Text>
              </View>
              <Switch
                value={autoConnect}
                onValueChange={setAutoConnect}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={autoConnect ? colors.primary : colors.textMuted}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: isValid ? colors.primary : colors.primary + '40' },
              ]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
                {editConfig ? 'Update' : 'Add Server'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

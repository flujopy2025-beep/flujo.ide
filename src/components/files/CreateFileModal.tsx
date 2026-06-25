import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CreateFileModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, type: 'file' | 'directory') => void;
  currentPath?: string;
}

export function CreateFileModal({ visible, onClose, onCreate, currentPath }: CreateFileModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [name, setName] = useState('');
  const [type, setType] = useState<'file' | 'directory'>('file');

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate(trimmedName, type);
    setName('');
    setType('file');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setType('file');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Create New {type === 'file' ? 'File' : 'Folder'}
          </Text>

          {currentPath ? (
            <Text style={[styles.pathLabel, { color: colors.textMuted }]}>
              in /{currentPath}
            </Text>
          ) : null}

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: type === 'file' ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setType('file')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: type === 'file' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                File
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor: type === 'directory' ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setType('directory')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: type === 'directory' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                Folder
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={type === 'file' ? 'filename.ts' : 'folder-name'}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                { backgroundColor: name.trim() ? colors.primary : colors.border },
              ]}
              onPress={handleCreate}
              disabled={!name.trim()}
            >
              <Text style={[styles.buttonText, { color: '#ffffff' }]}>Create</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modal: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  pathLabel: {
    fontSize: 12,
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  createButton: {},
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

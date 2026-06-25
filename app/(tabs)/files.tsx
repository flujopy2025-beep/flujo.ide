import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useEditor } from '../../src/contexts/EditorContext';
import { FileService } from '../../src/services/FileService';
import { FileTree } from '../../src/components/files/FileTree';
import { CreateFileModal } from '../../src/components/files/CreateFileModal';
import { FileNode } from '../../src/types';

export default function FilesScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { openFile } = useEditor();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      await FileService.ensureWorkspaceDir();
      const nodes = await FileService.listDirectory('');
      setFiles(nodes);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFilePress = useCallback(async (node: FileNode) => {
    if (node.type === 'file') {
      await openFile(node.path, node.name);
    }
  }, [openFile]);

  const handleDeleteFile = useCallback((node: FileNode) => {
    Alert.alert(
      'Delete',
      `Are you sure you want to delete "${node.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileService.deleteFile(node.path);
              await loadFiles();
            } catch (error) {
              Alert.alert('Error', `Failed to delete: ${String(error)}`);
            }
          },
        },
      ]
    );
  }, [loadFiles]);

  const handleRenameFile = useCallback((node: FileNode) => {
    Alert.prompt?.(
      'Rename',
      `Enter new name for "${node.name}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rename',
          onPress: async (newName?: string) => {
            if (!newName?.trim()) return;
            const parentPath = node.path.includes('/')
              ? node.path.substring(0, node.path.lastIndexOf('/'))
              : '';
            const newPath = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();
            try {
              await FileService.renameFile(node.path, newPath);
              await loadFiles();
            } catch (error) {
              Alert.alert('Error', `Failed to rename: ${String(error)}`);
            }
          },
        },
      ],
      'plain-text',
      node.name
    );
  }, [loadFiles]);

  const handleCreate = useCallback(async (name: string, type: 'file' | 'directory') => {
    try {
      if (type === 'file') {
        await FileService.createFile(name, '');
      } else {
        await FileService.createDirectory(name);
      }
      await loadFiles();
    } catch (error) {
      Alert.alert('Error', `Failed to create: ${String(error)}`);
    }
  }, [loadFiles]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Files</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Workspace
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* File Tree */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadFiles} />
        }
      >
        {files.length > 0 ? (
          <FileTree
            nodes={files}
            onFilePress={handleFilePress}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No files yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Tap + to create your first file or folder
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create File Modal */}
      <CreateFileModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

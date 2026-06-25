import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { FileNode } from '../../types';

interface FileTreeProps {
  nodes: FileNode[];
  onFilePress: (node: FileNode) => void;
  onDeleteFile: (node: FileNode) => void;
  onRenameFile: (node: FileNode) => void;
  level?: number;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFilePress: (node: FileNode) => void;
  onDeleteFile: (node: FileNode) => void;
  onRenameFile: (node: FileNode) => void;
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'logo-javascript';
    case 'ts':
    case 'tsx':
      return 'code-slash';
    case 'py':
      return 'logo-python';
    case 'html':
      return 'logo-html5';
    case 'css':
      return 'logo-css3';
    case 'json':
      return 'document-text';
    case 'md':
      return 'document';
    default:
      return 'document-outline';
  }
}

function FileTreeItem({ node, level, onFilePress, onDeleteFile, onRenameFile }: FileTreeItemProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [expanded, setExpanded] = useState(false);

  const handlePress = useCallback(() => {
    if (node.type === 'directory') {
      setExpanded((prev) => !prev);
    } else {
      onFilePress(node);
    }
  }, [node, onFilePress]);

  const handleLongPress = useCallback(() => {
    Alert.alert(
      node.name,
      'Choose an action',
      [
        { text: 'Rename', onPress: () => onRenameFile(node) },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteFile(node) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [node, onDeleteFile, onRenameFile]);

  const iconName = node.type === 'directory'
    ? (expanded ? 'folder-open' : 'folder')
    : getFileIcon(node.name);

  const iconColor = node.type === 'directory' ? colors.warning : colors.textSecondary;

  return (
    <View>
      <TouchableOpacity
        style={[styles.item, { paddingLeft: 12 + level * 16 }]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.6}
      >
        {node.type === 'directory' && (
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={12}
            color={colors.textMuted}
            style={styles.chevron}
          />
        )}
        {node.type === 'file' && <View style={styles.chevronPlaceholder} />}
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={16}
          color={iconColor}
          style={styles.icon}
        />
        <Text
          style={[styles.itemText, { color: colors.text }]}
          numberOfLines={1}
        >
          {node.name}
        </Text>
      </TouchableOpacity>
      {node.type === 'directory' && expanded && node.children && (
        <FileTree
          nodes={node.children}
          onFilePress={onFilePress}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
          level={level + 1}
        />
      )}
    </View>
  );
}

export function FileTree({
  nodes,
  onFilePress,
  onDeleteFile,
  onRenameFile,
  level = 0,
}: FileTreeProps) {
  return (
    <View>
      {nodes.map((node) => (
        <FileTreeItem
          key={node.id}
          node={node}
          level={level}
          onFilePress={onFilePress}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  chevron: {
    marginRight: 4,
    width: 12,
  },
  chevronPlaceholder: {
    width: 16,
  },
  icon: {
    marginRight: 8,
  },
  itemText: {
    fontSize: 13,
    flex: 1,
  },
});

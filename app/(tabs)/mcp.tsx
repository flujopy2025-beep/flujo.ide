/**
 * MCP Tab Screen - Lists configured MCP servers as ServerCards,
 * FAB to add new server, expandable section showing available tools.
 */

import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { MCPContext } from '../../src/contexts/MCPContext';
import { ServerCard } from '../../src/components/mcp/ServerCard';
import { AddServerModal } from '../../src/components/mcp/AddServerModal';
import { ToolsList } from '../../src/components/mcp/ToolsList';
import { MCPServerConfig } from '../../src/services/mcp';

export default function MCPScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const {
    connections,
    tools,
    addServer,
    updateServer,
    removeServer,
    connectServer,
    disconnectServer,
  } = useContext(MCPContext);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editConfig, setEditConfig] = useState<MCPServerConfig | null>(null);

  const serverNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const conn of connections) {
      names[conn.serverId] = conn.config.name;
    }
    return names;
  }, [connections]);

  const handleSaveServer = async (config: MCPServerConfig) => {
    if (editConfig) {
      await updateServer(config);
    } else {
      await addServer(config);
    }
    setEditConfig(null);
  };

  const handleEditServer = (config: MCPServerConfig) => {
    setEditConfig(config);
    setShowAddModal(true);
  };

  const handleDeleteServer = (serverId: string, serverName: string) => {
    Alert.alert(
      'Remove Server',
      `Are you sure you want to remove "${serverName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeServer(serverId),
        },
      ]
    );
  };

  const handleConnectServer = async (serverId: string) => {
    try {
      await connectServer(serverId);
    } catch (err) {
      // Error is displayed on the server card
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>MCP Servers</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Model Context Protocol connections
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {connections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="server-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No MCP servers configured
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
              Add an MCP server to connect AI tools and resources to your workflow.
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Server</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {connections.map((connection) => (
              <ServerCard
                key={connection.serverId}
                connection={connection}
                onConnect={() => handleConnectServer(connection.serverId)}
                onDisconnect={() => disconnectServer(connection.serverId)}
                onEdit={() => handleEditServer(connection.config)}
                onDelete={() =>
                  handleDeleteServer(connection.serverId, connection.config.name)
                }
              />
            ))}

            <ToolsList tools={tools} serverNames={serverNames} />
          </>
        )}
      </ScrollView>

      {/* FAB for adding servers */}
      {connections.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditConfig(null);
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <AddServerModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditConfig(null);
        }}
        onSave={handleSaveServer}
        editConfig={editConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

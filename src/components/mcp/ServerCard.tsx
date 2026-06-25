/**
 * ServerCard - Card component showing MCP server status and controls.
 * Displays name, status (connected/disconnected/error), tool count,
 * with connect/disconnect toggle and edit/delete buttons.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { MCPConnection } from '../../services/mcp';

interface ServerCardProps {
  connection: MCPConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServerCard({
  connection,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
}: ServerCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const getStatusColor = () => {
    switch (connection.state) {
      case 'connected':
        return colors.success;
      case 'connecting':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    switch (connection.state) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (connection.state) {
      case 'connected':
        return 'checkmark-circle';
      case 'connecting':
        return 'sync';
      case 'error':
        return 'alert-circle';
      default:
        return 'ellipse-outline';
    }
  };

  const isConnecting = connection.state === 'connecting';
  const isConnected = connection.state === 'connected';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {connection.config.name}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.statusRow}>
          {isConnecting ? (
            <ActivityIndicator size="small" color={colors.warning} />
          ) : (
            <Ionicons name={getStatusIcon()} size={14} color={getStatusColor()} />
          )}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>

        {connection.config.url && (
          <Text style={[styles.url, { color: colors.textMuted }]} numberOfLines={1}>
            {connection.config.url}
          </Text>
        )}

        {isConnected && (
          <Text style={[styles.toolCount, { color: colors.textSecondary }]}>
            {connection.tools.length} tool{connection.tools.length !== 1 ? 's' : ''} available
          </Text>
        )}

        {connection.error && (
          <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={2}>
            {connection.error}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.connectButton,
          {
            backgroundColor: isConnected ? colors.error + '20' : colors.primary + '20',
            borderColor: isConnected ? colors.error : colors.primary,
          },
        ]}
        onPress={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
      >
        <Ionicons
          name={isConnected ? 'power' : 'flash'}
          size={16}
          color={isConnected ? colors.error : colors.primary}
        />
        <Text
          style={[
            styles.connectButtonText,
            { color: isConnected ? colors.error : colors.primary },
          ]}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  info: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  url: {
    fontSize: 12,
    marginTop: 4,
  },
  toolCount: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * ToolsList - Expandable list showing all tools from connected MCP servers
 * with their descriptions and input schemas.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { MCPTool } from '../../services/mcp';

interface ToolsListProps {
  tools: MCPTool[];
  serverNames?: Record<string, string>;
}

interface ToolItemProps {
  tool: MCPTool;
  serverName?: string;
}

function ToolItem({ tool, serverName }: ToolItemProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [expanded, setExpanded] = useState(false);

  const paramCount = tool.inputSchema.properties
    ? Object.keys(tool.inputSchema.properties).length
    : 0;

  return (
    <View style={[styles.toolItem, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.toolHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.toolInfo}>
          <Ionicons
            name="construct-outline"
            size={14}
            color={colors.primary}
            style={styles.toolIcon}
          />
          <Text style={[styles.toolName, { color: colors.text }]}>{tool.name}</Text>
        </View>
        <View style={styles.toolMeta}>
          {paramCount > 0 && (
            <Text style={[styles.paramBadge, { color: colors.textMuted }]}>
              {paramCount} param{paramCount !== 1 ? 's' : ''}
            </Text>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.toolDetails, { borderTopColor: colors.border }]}>
          {tool.description && (
            <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>
              {tool.description}
            </Text>
          )}
          {serverName && (
            <Text style={[styles.serverLabel, { color: colors.textMuted }]}>
              Server: {serverName}
            </Text>
          )}
          {tool.inputSchema.properties &&
            Object.keys(tool.inputSchema.properties).length > 0 && (
              <View style={styles.schemaSection}>
                <Text style={[styles.schemaSectionTitle, { color: colors.textSecondary }]}>
                  Parameters:
                </Text>
                {Object.entries(tool.inputSchema.properties).map(([paramName, param]) => (
                  <View key={paramName} style={styles.paramRow}>
                    <View style={styles.paramHeader}>
                      <Text style={[styles.paramName, { color: colors.primary }]}>
                        {paramName}
                      </Text>
                      <Text style={[styles.paramType, { color: colors.textMuted }]}>
                        {param.type}
                      </Text>
                      {tool.inputSchema.required?.includes(paramName) && (
                        <Text style={[styles.requiredBadge, { color: colors.error }]}>
                          required
                        </Text>
                      )}
                    </View>
                    {param.description && (
                      <Text style={[styles.paramDescription, { color: colors.textMuted }]}>
                        {param.description}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
        </View>
      )}
    </View>
  );
}

export function ToolsList({ tools, serverNames }: ToolsListProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [expanded, setExpanded] = useState(true);

  if (tools.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No tools available. Connect to an MCP server to see its tools.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.sectionHeader, { borderBottomColor: colors.border }]}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.sectionTitle}>
          <Ionicons name="hammer-outline" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitleText, { color: colors.text }]}>
            Available Tools ({tools.length})
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.toolsList}>
          {tools.map((tool) => (
            <ToolItem
              key={`${tool.serverId}-${tool.name}`}
              tool={tool}
              serverName={serverNames?.[tool.serverId]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  emptyContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolsList: {
    marginTop: 8,
  },
  toolItem: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolIcon: {
    marginRight: 8,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paramBadge: {
    fontSize: 11,
  },
  toolDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  toolDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  serverLabel: {
    fontSize: 11,
    marginBottom: 8,
  },
  schemaSection: {
    marginTop: 4,
  },
  schemaSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  paramRow: {
    marginBottom: 6,
    paddingLeft: 8,
  },
  paramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paramName: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  paramType: {
    fontSize: 11,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  paramDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});

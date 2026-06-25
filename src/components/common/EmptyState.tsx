/**
 * EmptyState - Reusable component for screens with no data.
 * Displays an icon and a message centered on the screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  submessage?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  submessage,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={64}
        color={colors.textSecondary}
        style={styles.icon}
      />
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {submessage && (
        <Text style={[styles.submessage, { color: colors.textSecondary }]}>
          {submessage}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

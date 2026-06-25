import { Theme, ThemeColors } from '../types';

/**
 * Dark theme colors inspired by VS Code/Cursor dark theme
 */
export const darkColors: ThemeColors = {
  background: '#1E1E2E',
  surface: '#252536',
  surfaceHover: '#2D2D40',
  text: '#E4E4E8',
  textSecondary: '#A9B1D6',
  textMuted: '#565F89',
  primary: '#7AA2F7',
  primaryHover: '#89B4FA',
  secondary: '#9D7CD8',
  accent: '#73DACA',
  border: '#3B3B54',
  borderLight: '#44446A',
  error: '#F7768E',
  warning: '#E0AF68',
  success: '#9ECE6A',
  info: '#7DCFFF',
  tabBar: '#1A1A2E',
  tabBarInactive: '#565F89',
  tabBarActive: '#7AA2F7',
  statusBar: '#16161E',
  editorBackground: '#1A1B26',
  editorLineHighlight: '#24283B',
  editorGutter: '#3B4261',
};

/**
 * Light theme colors
 */
export const lightColors: ThemeColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceHover: '#F0F0F5',
  text: '#1A1B26',
  textSecondary: '#4C566A',
  textMuted: '#9CA3AF',
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  tabBar: '#FFFFFF',
  tabBarInactive: '#9CA3AF',
  tabBarActive: '#3B82F6',
  statusBar: '#F8FAFC',
  editorBackground: '#FFFFFF',
  editorLineHighlight: '#F1F5F9',
  editorGutter: '#94A3B8',
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
};

import { useContext } from 'react';
import { ThemeContext, ThemeContextValue } from '../contexts/ThemeContext';

/**
 * Convenience hook to access the current theme and toggle function
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

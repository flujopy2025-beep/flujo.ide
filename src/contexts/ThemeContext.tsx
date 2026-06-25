import React, { createContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Theme } from '../types';
import { darkTheme, lightTheme } from '../constants/themes';

export interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'dark' | 'light') => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: 'dark' | 'light';
}

export function ThemeProvider({ children, initialMode = 'dark' }: ThemeProviderProps) {
  const [mode, setMode] = useState<'dark' | 'light'>(initialMode);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setThemeMode = useCallback((newMode: 'dark' | 'light') => {
    setMode(newMode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'dark' ? darkTheme : lightTheme,
      isDark: mode === 'dark',
      toggleTheme,
      setThemeMode,
    }),
    [mode, toggleTheme, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

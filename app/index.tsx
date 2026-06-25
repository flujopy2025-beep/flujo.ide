/**
 * Index/Entry screen - decides whether to show onboarding or go to tabs.
 * This is the proper way to handle conditional routing in expo-router.
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('@flujo_onboarding_complete');
        if (value === 'true') {
          router.replace('/(tabs)/editor');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        // If storage fails, go to tabs directly
        router.replace('/(tabs)/editor');
      } finally {
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [router]);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Onboarding Screen - Shown on first launch
 * Professional splash with branding, animated fade-in, and Get Started button.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const BRAND_CYAN = '#00D4FF';
const BG_DARK = '#0D1117';

function RobotLogo() {
  return (
    <View style={logoStyles.container}>
      {/* Robot head */}
      <View style={logoStyles.head}>
        {/* Antenna */}
        <View style={logoStyles.antenna} />
        <View style={logoStyles.antennaBase} />
        {/* Eyes */}
        <View style={logoStyles.eyeRow}>
          <View style={logoStyles.eye}>
            <View style={logoStyles.eyeInner} />
          </View>
          <View style={logoStyles.eye}>
            <View style={logoStyles.eyeInner} />
          </View>
        </View>
        {/* Mouth */}
        <View style={logoStyles.mouth} />
      </View>
      {/* Robot body */}
      <View style={logoStyles.body}>
        <View style={logoStyles.codeSymbol}>
          <Text style={logoStyles.codeText}>{'< />'}</Text>
        </View>
      </View>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 32,
  },
  head: {
    width: 100,
    height: 80,
    backgroundColor: '#161B22',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#30363D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  antenna: {
    width: 3,
    height: 20,
    backgroundColor: BRAND_CYAN,
    position: 'absolute',
    top: -20,
  },
  antennaBase: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_CYAN,
    position: 'absolute',
    top: -25,
  },
  eyeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  eye: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BRAND_CYAN,
    shadowColor: BRAND_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  mouth: {
    width: 30,
    height: 4,
    backgroundColor: '#30363D',
    borderRadius: 2,
    marginTop: 12,
  },
  body: {
    width: 80,
    height: 50,
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#30363D',
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSymbol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_CYAN,
    fontFamily: 'monospace',
  },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('@flujo_onboarding_complete', 'true');
    } catch {
      // Continue even if storage fails
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <RobotLogo />

        {/* App Title */}
        <Text style={styles.title}>Flujo IDE</Text>
        <View style={styles.glowLine} />

        {/* Subtitle */}
        <Text style={styles.subtitle}>Mobile Code Editor with AI & MCP</Text>

        {/* Feature highlights */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>CodeMirror 6 Editor</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>AI Chat (OpenAI, Claude, Gemini, OpenRouter)</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>MCP Server Integration</Text>
          </View>
        </View>
      </Animated.View>

      {/* Get Started Button */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: BRAND_CYAN,
    textShadowColor: BRAND_CYAN,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 1,
  },
  glowLine: {
    width: width * 0.4,
    height: 2,
    backgroundColor: BRAND_CYAN,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 1,
    shadowColor: BRAND_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  features: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_CYAN,
    shadowColor: BRAND_CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  featureText: {
    fontSize: 14,
    color: '#C9D1D9',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingBottom: 60,
    width: '100%',
  },
  button: {
    backgroundColor: BRAND_CYAN,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: BRAND_CYAN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: BG_DARK,
    letterSpacing: 0.5,
  },
});

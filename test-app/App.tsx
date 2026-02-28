import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function App() {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    console.log('🌈🌈🌈 MASSIVE REDESIGN LOADED AT ' + new Date().toLocaleTimeString() + ' 🌈🌈🌈');
  }, []);

  const handleTap = () => {
    setScore(s => s + 1);
    setStreak(s => s + 1);
  };

  const handleReset = () => {
    setScore(0);
    setStreak(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌈</Text>
      <Text style={styles.title}>LIVE UPDATE! IT WORKS!</Text>
      <Text style={styles.subtitle}>Hot reload via AppTuner relay ⚡️</Text>

      <View style={styles.scoreBox}>
        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.streakText}>🔥 Streak: {streak}</Text>
      </View>

      <TouchableOpacity style={styles.tapButton} onPress={handleTap}>
        <Text style={styles.tapButtonText}>TAP ME!</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 90,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 40,
    textAlign: 'center',
  },
  scoreBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    marginBottom: 30,
    minWidth: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    letterSpacing: 3,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 80,
    fontWeight: '900',
    color: '#1a1a1a',
    lineHeight: 88,
  },
  streakText: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
  },
  tapButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 50,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tapButtonText: {
    color: '#FF6B35',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  resetButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  resetButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
});

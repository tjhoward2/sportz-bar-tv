import { SPORT_IDS, SPORTS } from '@sbtv/core';
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, TAP } from '@/theme';

// Placeholder home screen. Proves the app boots and imports shared code;
// replaced by the Games tab in Phase 6.
export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Sportz Bar TV' }} />
      <Text style={styles.subtitle}>Foundation build. Games arrive in Phase 6.</Text>
      <View style={styles.chips}>
        {SPORT_IDS.map((id) => (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>
              {SPORTS[id].emoji} {SPORTS[id].label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  subtitle: { color: colors.muted, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: TAP,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.text, fontSize: 15 },
});

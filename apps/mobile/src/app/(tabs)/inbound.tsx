import { glossary } from '@ltb/shared';
import { StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';

export default function InboundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No applications yet.</Text>
      <Text style={styles.sub}>{glossary.inbound.blurredHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { color: LTB.ink, fontWeight: '600', fontSize: 16 },
  sub: { color: LTB.inkSecondary, textAlign: 'center' },
});

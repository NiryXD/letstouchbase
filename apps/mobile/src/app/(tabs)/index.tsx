import { glossary } from '@ltb/shared';
import { StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';

export default function CandidatesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.pickCard}>
        <Text style={styles.pickLabel}>{glossary.discovery.recruitersPick}</Text>
        <Text style={styles.pickHint}>Your algorithm-blessed candidate arrives daily.</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{glossary.discovery.emptyDeck}</Text>
        <Text style={styles.emptySub}>Candidate review opens once discovery is wired up.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  pickCard: {
    backgroundColor: LTB.paper,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: LTB.gold,
    padding: 16,
  },
  pickLabel: { color: LTB.navy, fontWeight: '700', fontSize: 16 },
  pickHint: { color: LTB.inkSecondary, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { color: LTB.ink, fontWeight: '600', fontSize: 16, textAlign: 'center' },
  emptySub: { color: LTB.inkSecondary, textAlign: 'center' },
});

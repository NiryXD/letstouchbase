import { glossary } from '@ltb/shared';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';

/** The match celebration — a formal offer letter, obviously. */
export function OfferExtendedModal({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.letter}>
          <Text style={styles.letterhead}>{glossary.brand.name.toUpperCase()}</Text>
          <View style={styles.rule} />
          <Text style={styles.title}>🎉 {glossary.match.celebration}</Text>
          <Text style={styles.body}>
            We are pleased to inform you that your application with {name} has been{' '}
            <Text style={styles.bold}>accepted</Text>. Compensation: companionship, market rate.
            Start date: immediately.
          </Text>
          <Text style={styles.body}>{glossary.match.celebrationSub}</Text>
          <Pressable style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaText}>Accept Offer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(29,34,38,0.6)',
  },
  letter: { backgroundColor: LTB.paper, borderRadius: 8, padding: 24 },
  letterhead: { color: LTB.primary, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  rule: { height: 2, backgroundColor: LTB.primary, marginVertical: 12 },
  title: { color: LTB.navy, fontWeight: '800', fontSize: 22, marginBottom: 12 },
  body: { color: LTB.ink, lineHeight: 21, marginBottom: 10 },
  bold: { fontWeight: '700' },
  cta: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: LTB.paper, fontWeight: '700', fontSize: 16 },
});

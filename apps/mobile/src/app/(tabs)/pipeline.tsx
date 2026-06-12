import { glossary } from '@ltb/shared';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';

export default function PipelineScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {glossary.pipeline.stages.map((stage) => (
        <View key={stage} style={styles.column}>
          <Text style={styles.stage}>{stage}</Text>
          <Text style={styles.count}>0 candidates</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  column: {
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: LTB.primary,
  },
  stage: { color: LTB.navy, fontWeight: '700' },
  count: { color: LTB.inkSecondary, marginTop: 4 },
});

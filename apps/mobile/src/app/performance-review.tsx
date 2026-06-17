// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 4) ───────
import { glossary } from '@ltb/shared';
import { Stack } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { usePerformanceReview } from '@/lib/analytics';

const M = glossary.analytics.metrics;

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

export default function PerformanceReviewScreen() {
  const { data, isLoading } = usePerformanceReview();

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: glossary.analytics.title,
        headerStyle: { backgroundColor: LTB.paper },
        headerTintColor: LTB.navy,
        headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
      }}
    />
  );

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={LTB.primary} size="large" />
      </View>
    );
  }

  // Screen-to-Offer rate: share of outbound screens that converted to a match.
  const conversion =
    data.screensSent > 0 ? Math.round((data.screensAccepted / data.screensSent) * 100) : null;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const hireDate = new Date(data.memberSince).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {header}
      <Text style={styles.letterhead}>{glossary.brand.name.toUpperCase()}</Text>
      <View style={styles.rule} />
      <Text style={styles.sub}>{glossary.analytics.sub}</Text>

      <View style={styles.grid}>
        <Metric label={M.impressions} value={String(data.impressions)} sub={M.impressionsSub} />
        <Metric
          label={M.screensReceived}
          value={String(data.screensReceived)}
          sub={M.screensReceivedSub}
        />
        <Metric label={M.screensSent} value={String(data.screensSent)} sub={M.screensSentSub} />
        <Metric
          label={M.conversionRate}
          value={conversion === null ? '—' : `${conversion}%`}
          sub={M.conversionRateSub}
        />
        <Metric label={M.offers} value={String(data.offers)} sub={M.offersSub} />
        <Metric label={M.activeOffers} value={String(data.activeOffers)} sub={M.activeOffersSub} />
        <Metric label={M.endorsements} value={String(data.endorsements)} />
        <Metric label={M.references} value={String(data.references)} />
        <Metric label={M.desirability} value={pct(data.desirability)} sub={M.desirabilitySub} />
        <Metric label={M.completeness} value={pct(data.completeness)} />
      </View>

      <Text style={styles.footer}>
        {M.memberSince}: {hireDate}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: LTB.feedGray },
  content: { padding: 16, gap: 12 },
  letterhead: { color: LTB.primary, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  rule: { height: 2, backgroundColor: LTB.primary },
  sub: { color: LTB.inkSecondary, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: LTB.primary,
  },
  metricValue: { color: LTB.navy, fontWeight: '800', fontSize: 28 },
  metricLabel: { color: LTB.ink, fontWeight: '600', marginTop: 4 },
  metricSub: { color: LTB.inkSecondary, fontSize: 12, marginTop: 4, lineHeight: 16 },
  footer: { color: LTB.inkSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 },
});

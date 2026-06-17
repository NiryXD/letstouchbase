// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 6) ───────
import { glossary } from '@ltb/shared';
import { Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/notification-prefs';

const N = glossary.notifications;

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function Row({
  label,
  sub,
  value,
  disabled,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowMeta}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onChange} trackColor={{ true: LTB.primary }} />
    </View>
  );
}

function HourStepper({ label, hour, onChange }: { label: string; hour: number; onChange: (h: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => onChange((hour + 23) % 24)}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{formatHour(hour)}</Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange((hour + 1) % 24)}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { data: prefs } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: N.title,
        headerStyle: { backgroundColor: LTB.paper },
        headerTintColor: LTB.navy,
        headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
      }}
    />
  );

  if (!prefs) {
    return (
      <View style={styles.container}>
        {header}
      </View>
    );
  }

  const set = (patch: Partial<NotificationPrefs>) => update.mutate(patch);
  const quietOn = prefs.quietStart !== null && prefs.quietEnd !== null;
  const muted = !prefs.pushEnabled;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {header}
      <Text style={styles.sub}>{N.sub}</Text>

      <View style={styles.card}>
        <Row
          label={N.master}
          sub={N.masterSub}
          value={prefs.pushEnabled}
          onChange={(v) => set({ pushEnabled: v })}
        />
      </View>

      <Text style={styles.sectionLabel}>{N.categoriesTitle}</Text>
      <View style={styles.card}>
        <Row label={N.categories.screens} sub={N.categories.screensSub} value={prefs.screens} disabled={muted} onChange={(v) => set({ screens: v })} />
        <Row label={N.categories.matches} sub={N.categories.matchesSub} value={prefs.matches} disabled={muted} onChange={(v) => set({ matches: v })} />
        <Row label={N.categories.messages} sub={N.categories.messagesSub} value={prefs.messages} disabled={muted} onChange={(v) => set({ messages: v })} />
        <Row label={N.categories.rejections} sub={N.categories.rejectionsSub} value={prefs.rejections} disabled={muted} onChange={(v) => set({ rejections: v })} />
      </View>

      <Text style={styles.sectionLabel}>{N.quietTitle}</Text>
      <View style={styles.card}>
        <Row
          label={N.quietEnable}
          sub={N.quietSub}
          value={quietOn}
          disabled={muted}
          onChange={(v) => set(v ? { quietStart: 22, quietEnd: 7 } : { quietStart: null, quietEnd: null })}
        />
        {quietOn && !muted ? (
          <>
            <HourStepper label={N.quietFrom} hour={prefs.quietStart!} onChange={(h) => set({ quietStart: h })} />
            <HourStepper label={N.quietTo} hour={prefs.quietEnd!} onChange={(h) => set({ quietEnd: h })} />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  content: { padding: 16, gap: 10 },
  sub: { color: LTB.inkSecondary, lineHeight: 19 },
  sectionLabel: { color: LTB.inkSecondary, fontSize: 12, fontWeight: '700', marginTop: 8, marginLeft: 4 },
  card: { backgroundColor: LTB.paper, borderRadius: 8, padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowDisabled: { opacity: 0.45 },
  rowMeta: { flex: 1 },
  rowLabel: { color: LTB.ink, fontWeight: '600' },
  rowSub: { color: LTB.inkSecondary, fontSize: 12, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  stepperLabel: { color: LTB.ink, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LTB.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: LTB.primary, fontSize: 20, fontWeight: '700' },
  stepValue: { color: LTB.navy, fontWeight: '700', fontSize: 15, minWidth: 64, textAlign: 'center' },
});

import { glossary } from '@ltb/shared';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { photoUrl, type AnnotatedItem, type ResumeCard as Card } from '@/lib/discovery';

const OTW_COLORS = {
  committed: LTB.openToWork.committed,
  casual: LTB.openToWork.casual,
  networking: LTB.openToWork.networking,
} as const;

function Annotatable({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {children}
      <Text style={styles.annotateHint}>tap to screen on this ✉</Text>
    </Pressable>
  );
}

/**
 * One full scrollable resume — photos interleaved with answers, experience,
 * and education. Tapping any item opens the Cover Letter composer for it.
 */
export function ResumeCard({
  card,
  onAnnotate,
  footer,
}: {
  card: Card;
  onAnnotate: (item: AnnotatedItem) => void;
  footer?: ReactNode;
}) {
  // interleave: photo, header, answer, photo, experience, answer, photo, education, answer, photo…
  const photos = [...card.photos];
  const answers = [...card.answers];
  const blocks: ReactNode[] = [];
  const pushPhoto = () => {
    const p = photos.shift();
    if (!p) return;
    blocks.push(
      <Annotatable
        key={`photo-${p.id}`}
        onPress={() =>
          onAnnotate({ kind: 'photo', id: String(p.id), excerpt: `their ${p.slot.replace(/_/g, ' ')} photo` })
        }>
        <Image source={{ uri: photoUrl(p.path) }} style={styles.photo} />
      </Annotatable>,
    );
  };
  const pushAnswer = () => {
    const a = answers.shift();
    if (!a) return;
    blocks.push(
      <Annotatable
        key={`answer-${a.id}`}
        onPress={() =>
          onAnnotate({ kind: 'behavioral_answer', id: String(a.id), excerpt: `"${a.answer.slice(0, 60)}…"` })
        }>
        <View style={styles.block}>
          <Text style={styles.q}>{a.question}</Text>
          <Text style={styles.a}>{a.answer}</Text>
        </View>
      </Annotatable>,
    );
  };

  pushPhoto();

  blocks.push(
    <Annotatable
      key="headline"
      onPress={() => onAnnotate({ kind: 'headline', id: 'headline', excerpt: `"${card.headline}"` })}>
      <View style={styles.block}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {card.firstName}, {card.age}
          </Text>
          <View style={[styles.otwDot, { backgroundColor: OTW_COLORS[card.openToWork] }]} />
        </View>
        <Text style={styles.headline}>{card.headline}</Text>
        {card.currentTitle ? (
          <Text style={styles.meta}>
            {card.currentTitle}
            {card.employer ? ` @ ${card.employer}` : ''}
            {card.industry ? ` · ${card.industry}` : ''}
          </Text>
        ) : null}
        {card.archetype ? <Text style={styles.archetype}>Dept: {card.archetype}</Text> : null}
        {card.executiveSummary ? <Text style={styles.summary}>{card.executiveSummary}</Text> : null}
        {card.outOfOffice ? (
          <Text style={styles.ooo}>🟡 {glossary.profile.outOfOffice} — replies may be delayed</Text>
        ) : null}
      </View>
    </Annotatable>,
  );

  pushAnswer();
  pushPhoto();

  if (card.experience.length) {
    blocks.push(
      <View key="experience" style={styles.block}>
        <Text style={styles.section}>Experience</Text>
        {card.experience.map((e) => (
          <Annotatable
            key={e.id}
            onPress={() =>
              onAnnotate({ kind: 'experience', id: String(e.id), excerpt: `${e.title}${e.company ? ` @ ${e.company}` : ''}` })
            }>
            <View style={styles.entry}>
              <Text style={styles.entryTitle}>
                {e.title}
                {e.company ? ` @ ${e.company}` : ''}
              </Text>
              <Text style={styles.entryMeta}>
                {e.industry} · {e.startYear}–{e.endYear ?? 'Present'}
              </Text>
              {e.oneLiner ? <Text style={styles.entryLine}>{e.oneLiner}</Text> : null}
            </View>
          </Annotatable>
        ))}
      </View>,
    );
  }

  pushAnswer();
  pushPhoto();

  if (card.education.length) {
    blocks.push(
      <View key="education" style={styles.block}>
        <Text style={styles.section}>Education</Text>
        {card.education.map((ed) => (
          <Annotatable
            key={ed.id}
            onPress={() =>
              onAnnotate({ kind: 'education', id: String(ed.id), excerpt: `${ed.degreeLevel} — ${ed.school}` })
            }>
            <View style={styles.entry}>
              <Text style={styles.entryTitle}>
                {ed.degreeLevel}
                {ed.field ? `, ${ed.field}` : ''}
              </Text>
              <Text style={styles.entryMeta}>
                {ed.school} · Class of {ed.classYear}
              </Text>
            </View>
          </Annotatable>
        ))}
      </View>,
    );
  }

  pushAnswer();
  while (photos.length) pushPhoto();
  while (answers.length) pushAnswer();

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {blocks}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 12, paddingBottom: 24 },
  pressed: { opacity: 0.85 },
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 8,
    backgroundColor: LTB.divider,
  },
  block: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: LTB.navy, fontWeight: '800', fontSize: 24 },
  otwDot: { width: 12, height: 12, borderRadius: 6 },
  headline: { color: LTB.ink, fontSize: 16, marginTop: 4, fontStyle: 'italic' },
  meta: { color: LTB.inkSecondary, marginTop: 6 },
  archetype: { color: LTB.primary, marginTop: 4, fontSize: 13, fontWeight: '600' },
  summary: { color: LTB.ink, marginTop: 10, lineHeight: 20 },
  ooo: { color: LTB.inkSecondary, marginTop: 8, fontSize: 12 },
  section: { color: LTB.navy, fontWeight: '700', fontSize: 15, marginBottom: 8 },
  q: { color: LTB.navy, fontWeight: '600', marginBottom: 6 },
  a: { color: LTB.ink, fontSize: 16, lineHeight: 22 },
  entry: { marginBottom: 10 },
  entryTitle: { color: LTB.ink, fontWeight: '600' },
  entryMeta: { color: LTB.inkSecondary, fontSize: 13, marginTop: 2 },
  entryLine: { color: LTB.ink, fontSize: 13, marginTop: 4 },
  annotateHint: {
    color: LTB.primary,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
  },
});

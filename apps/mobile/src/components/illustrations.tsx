// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (design pass) ────
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { LTB } from '@/constants/theme';

/**
 * Corporate-Memphis empty-state art — flat, big-shape illustrations in the LTB
 * palette (LinkedIn blue + a pale-blue tint + navy + gold). Deadpan B2B-SaaS
 * energy on purpose. Recolorable via the theme tokens; no external assets.
 */
const TINT = '#E8F0F9'; // theme backgroundSelected — the pale-blue fill

/** Empty deck — a résumé under a magnifying glass ("sourcing candidates"). */
export function SourcingArt() {
  return (
    <Svg width={180} height={150} viewBox="0 0 180 150">
      <Rect x={34} y={18} width={86} height={112} rx={10} fill={LTB.paper} stroke={LTB.divider} strokeWidth={2} />
      <Rect x={48} y={34} width={36} height={36} rx={18} fill={TINT} />
      <Line x1={48} y1={86} x2={106} y2={86} stroke={LTB.divider} strokeWidth={5} strokeLinecap="round" />
      <Line x1={48} y1={100} x2={106} y2={100} stroke={LTB.divider} strokeWidth={5} strokeLinecap="round" />
      <Line x1={48} y1={114} x2={84} y2={114} stroke={LTB.divider} strokeWidth={5} strokeLinecap="round" />
      <G>
        <Circle cx={120} cy={92} r={26} fill="none" stroke={LTB.primary} strokeWidth={7} />
        <Line x1={139} y1={111} x2={158} y2={130} stroke={LTB.primary} strokeWidth={9} strokeLinecap="round" />
      </G>
      <Circle cx={140} cy={28} r={6} fill={LTB.gold} />
      <Circle cx={28} cy={120} r={5} fill={LTB.primary} />
    </Svg>
  );
}

/** Inbox zero — an empty in-tray with a couple of filed papers behind it. */
export function InboxZeroArt() {
  return (
    <Svg width={180} height={150} viewBox="0 0 180 150">
      <Rect x={64} y={20} width={70} height={44} rx={6} fill={LTB.paper} stroke={LTB.divider} strokeWidth={2} transform="rotate(-8 99 42)" />
      <Path d="M30 70 h120 v30 a14 14 0 0 1 -14 14 H44 a14 14 0 0 1 -14 -14 Z" fill={TINT} stroke={LTB.primary} strokeWidth={3} />
      <Path d="M30 70 l16 -22 h88 l16 22" fill="none" stroke={LTB.primary} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M30 86 h34 l8 12 h36 l8 -12 h34" fill="none" stroke={LTB.primary} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={150} cy={34} r={6} fill={LTB.gold} />
      <Circle cx={34} cy={40} r={5} fill={LTB.primary} />
    </Svg>
  );
}

/** Empty pipeline — three kanban columns with one open slot and a flag. */
export function EmptyPipelineArt() {
  return (
    <Svg width={188} height={150} viewBox="0 0 188 150">
      {[14, 70, 126].map((x, i) => (
        <Rect key={x} x={x} y={24} width={48} height={104} rx={8} fill={i === 0 ? TINT : LTB.paper} stroke={LTB.divider} strokeWidth={2} />
      ))}
      <Rect x={22} y={36} width={32} height={22} rx={5} fill={LTB.primary} />
      <Rect x={22} y={66} width={32} height={22} rx={5} fill={LTB.paper} stroke={LTB.primary} strokeWidth={2} strokeDasharray="4 4" />
      <Rect x={78} y={36} width={32} height={22} rx={5} fill={LTB.divider} />
      <G>
        <Line x1={150} y1={24} x2={150} y2={6} stroke={LTB.navy} strokeWidth={4} strokeLinecap="round" />
        <Path d="M150 8 h18 v12 h-18 Z" fill={LTB.gold} />
      </G>
    </Svg>
  );
}

/** Offer / upgrade — a rising bar chart topped with a star. */
export function OfferArt() {
  return (
    <Svg width={180} height={150} viewBox="0 0 180 150">
      <Line x1={26} y1={128} x2={160} y2={128} stroke={LTB.divider} strokeWidth={3} strokeLinecap="round" />
      <Rect x={40} y={92} width={26} height={36} rx={4} fill={TINT} stroke={LTB.primary} strokeWidth={2} />
      <Rect x={78} y={66} width={26} height={62} rx={4} fill={LTB.primary} />
      <Rect x={116} y={40} width={26} height={88} rx={4} fill={LTB.navy} />
      <Path
        d="M129 8 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 Z"
        fill={LTB.gold}
      />
    </Svg>
  );
}

/**
 * Empty-state scaffold: illustration + title + body + optional CTA. Drop-in for
 * the plain-text empty screens.
 */
export function EmptyState({
  art,
  title,
  body,
  ctaLabel,
  onPressCta,
}: {
  art: ReactNode;
  title: string;
  body?: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {art}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {ctaLabel && onPressCta ? (
        <Pressable style={styles.cta} onPress={onPressCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  title: { color: LTB.navy, fontWeight: '700', fontSize: 18, textAlign: 'center', marginTop: 8 },
  body: { color: LTB.inkSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  cta: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  ctaText: { color: LTB.paper, fontWeight: '700' },
});

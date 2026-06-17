// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 5) ───────
import { glossary } from '@ltb/shared';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { LTB } from '@/constants/theme';
import { useEntitlements, useRefreshEntitlements } from '@/lib/entitlements';
import {
  getCurrentOffering,
  isPurchasesAvailable,
  purchasePackage,
  restorePurchases,
} from '@/lib/purchases';

const P = glossary.premium;

export default function PaywallScreen() {
  const { data: entitlements } = useEntitlements();
  const refresh = useRefreshEntitlements();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const available = isPurchasesAvailable();

  useEffect(() => {
    let active = true;
    (async () => {
      const offering = await getCurrentOffering();
      if (active) setPackages(offering?.availablePackages ?? []);
    })().catch(() => active && setPackages([]));
    return () => {
      active = false;
    };
  }, []);

  const onBuy = async (pkg: PurchasesPackage) => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await purchasePackage(pkg);
      await refresh();
      router.back();
    } catch (e) {
      if (!(e as { userCancelled?: boolean })?.userCancelled) {
        setNotice(P.purchaseFailed);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await restorePurchases();
      await refresh();
      setNotice(P.restoreNone);
    } catch {
      setNotice(P.restoreNone);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: P.paywallTitle,
          headerStyle: { backgroundColor: LTB.paper },
          headerTintColor: LTB.navy,
          headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
        }}
      />
      <Text style={styles.letterhead}>{P.tierName.toUpperCase()}</Text>
      <View style={styles.rule} />

      {entitlements?.isExecutive ? (
        <View style={styles.activeBadge}>
          <Text style={styles.activeText}>✓ {P.activeBadge}</Text>
        </View>
      ) : null}

      <Text style={styles.sub}>{P.paywallSub}</Text>

      <View style={styles.perks}>
        {P.perks.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <Text style={styles.perkCheck}>✓</Text>
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.disclaimer}>{P.perksDisclaimer}</Text>

      {!available ? (
        <Text style={styles.unavailable}>{P.unavailable}</Text>
      ) : packages === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={LTB.primary} />
          <Text style={styles.loadingText}>{P.loadingOffer}</Text>
        </View>
      ) : packages.length === 0 ? (
        <Text style={styles.unavailable}>{P.unavailable}</Text>
      ) : (
        packages.map((pkg) => (
          <Pressable
            key={pkg.identifier}
            style={[styles.buy, busy && styles.disabled]}
            disabled={busy || entitlements?.isExecutive}
            onPress={() => onBuy(pkg)}>
            <Text style={styles.buyTitle}>{pkg.product.title || P.tierName}</Text>
            <Text style={styles.buyPrice}>{pkg.product.priceString}</Text>
          </Pressable>
        ))
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Pressable style={styles.restore} disabled={busy || !available} onPress={onRestore}>
        <Text style={styles.restoreText}>{P.restore}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  content: { padding: 16, gap: 12 },
  letterhead: { color: LTB.primary, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  rule: { height: 2, backgroundColor: LTB.primary },
  activeBadge: {
    backgroundColor: LTB.openToWork.committed,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  activeText: { color: LTB.paper, fontWeight: '700' },
  sub: { color: LTB.inkSecondary, lineHeight: 20 },
  perks: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16, gap: 12 },
  perkRow: { flexDirection: 'row', gap: 10 },
  perkCheck: { color: LTB.primary, fontWeight: '800' },
  perkText: { color: LTB.ink, flex: 1, lineHeight: 20 },
  disclaimer: { color: LTB.inkSecondary, fontSize: 12, fontStyle: 'italic', lineHeight: 17 },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 16 },
  loadingText: { color: LTB.inkSecondary },
  unavailable: {
    color: LTB.inkSecondary,
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 16,
    lineHeight: 19,
    textAlign: 'center',
  },
  buy: {
    backgroundColor: LTB.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyTitle: { color: LTB.paper, fontWeight: '700', fontSize: 15, flex: 1 },
  buyPrice: { color: LTB.paper, fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  notice: { color: LTB.reject, textAlign: 'center' },
  restore: { padding: 14, alignItems: 'center' },
  restoreText: { color: LTB.primary, fontWeight: '600' },
});

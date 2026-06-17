// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 5) ───────
import { glossary } from '@ltb/shared';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { LTB } from '@/constants/theme';
import { useActivateBoost, useEntitlements, useRefreshEntitlements } from '@/lib/entitlements';
import { getConsumablePackages, isPurchasesAvailable, purchasePackage } from '@/lib/purchases';

const P = glossary.premium;

export default function DiscretionaryBudgetScreen() {
  const { data: entitlements } = useEntitlements();
  const refresh = useRefreshEntitlements();
  const activateBoost = useActivateBoost();
  const [packs, setPacks] = useState<{ headhunts: PurchasesPackage[]; boosts: PurchasesPackage[] } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const available = isPurchasesAvailable();

  useEffect(() => {
    let active = true;
    getConsumablePackages()
      .then((p) => active && setPacks(p))
      .catch(() => active && setPacks({ headhunts: [], boosts: [] }));
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
    } catch (e) {
      if (!(e as { userCancelled?: boolean })?.userCancelled) setNotice(P.purchaseFailed);
    } finally {
      setBusy(false);
    }
  };

  const onActivateBoost = async () => {
    if (activateBoost.isPending) return;
    try {
      await activateBoost.mutateAsync();
      Alert.alert(P.boost, P.boostDone);
    } catch {
      Alert.alert(P.boost, P.boostNone);
    }
  };

  const renderPack = (pkg: PurchasesPackage) => (
    <Pressable
      key={pkg.identifier}
      style={[styles.buy, busy && styles.disabled]}
      disabled={busy}
      onPress={() => onBuy(pkg)}>
      <Text style={styles.buyTitle}>{pkg.product.title || pkg.product.identifier}</Text>
      <Text style={styles.buyPrice}>{pkg.product.priceString}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: P.consumablesTitle,
          headerStyle: { backgroundColor: LTB.paper },
          headerTintColor: LTB.navy,
          headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
        }}
      />
      <Text style={styles.sub}>{P.consumablesSub}</Text>

      {/* Headhunts */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>★ {P.headhunt}</Text>
        <Text style={styles.cardSub}>{P.headhuntSub}</Text>
        <Text style={styles.balance}>{P.headhuntCredits(entitlements?.headhuntCredits ?? 0)}</Text>
        {!available ? (
          <Text style={styles.unavailable}>{P.unavailable}</Text>
        ) : packs === null ? (
          <ActivityIndicator color={LTB.primary} />
        ) : packs.headhunts.length === 0 ? (
          <Text style={styles.unavailable}>{P.unavailable}</Text>
        ) : (
          packs.headhunts.map(renderPack)
        )}
      </View>

      {/* Expedited Reviews */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ {P.boost}</Text>
        <Text style={styles.cardSub}>{P.boostSub}</Text>
        <Text style={styles.balance}>{P.boostCredits(entitlements?.boostCredits ?? 0)}</Text>
        {(entitlements?.boostCredits ?? 0) > 0 ? (
          <Pressable
            style={[styles.activate, activateBoost.isPending && styles.disabled]}
            disabled={activateBoost.isPending}
            onPress={onActivateBoost}>
            {activateBoost.isPending ? (
              <ActivityIndicator color={LTB.paper} />
            ) : (
              <Text style={styles.activateText}>{P.boostActivate}</Text>
            )}
          </Pressable>
        ) : null}
        {!available ? (
          <Text style={styles.unavailable}>{P.unavailable}</Text>
        ) : packs === null ? (
          <ActivityIndicator color={LTB.primary} />
        ) : packs.boosts.length === 0 ? (
          <Text style={styles.unavailable}>{P.unavailable}</Text>
        ) : (
          packs.boosts.map(renderPack)
        )}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  content: { padding: 16, gap: 12 },
  sub: { color: LTB.inkSecondary, lineHeight: 19 },
  card: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16, gap: 8 },
  cardTitle: { color: LTB.navy, fontWeight: '700', fontSize: 16 },
  cardSub: { color: LTB.inkSecondary, lineHeight: 18 },
  balance: { color: LTB.ink, fontWeight: '600', marginTop: 2 },
  buy: {
    backgroundColor: LTB.primary,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  buyTitle: { color: LTB.paper, fontWeight: '700', flex: 1 },
  buyPrice: { color: LTB.paper, fontWeight: '800' },
  activate: {
    backgroundColor: LTB.gold,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  activateText: { color: LTB.paper, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  unavailable: { color: LTB.inkSecondary, fontSize: 13, lineHeight: 18 },
  notice: { color: LTB.reject, textAlign: 'center' },
});

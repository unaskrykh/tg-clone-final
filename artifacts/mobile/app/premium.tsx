import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";

const PERKS = [
  { icon: "flash", title: "4GB File Uploads", desc: "Send files up to 4GB in size" },
  { icon: "happy", title: "Emoji Status", desc: "Show emoji status next to your name" },
  { icon: "text", title: "Extended Bio", desc: "Write a longer profile bio" },
  { icon: "star", title: "Premium Badge", desc: "Gold star badge on your profile" },
  { icon: "color-palette", title: "Custom Themes", desc: "Access exclusive chat themes" },
  { icon: "chatbubbles", title: "Priority Support", desc: "Get help faster" },
];

export default function PremiumScreen() {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const PREMIUM_COST = 50;
  const canAfford = (user?.stars || 0) >= PREMIUM_COST;

  async function purchasePremium() {
    if (!canAfford) {
      Alert.alert("Not Enough Stars", `You need ${PREMIUM_COST} Stars to purchase Premium. You have ${user?.stars || 0} Stars.`);
      return;
    }
    Alert.alert(
      "Confirm Purchase",
      `Purchase TG Premium for ${PREMIUM_COST} Stars?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: async () => {
            setIsPurchasing(true);
            try {
              const updated = await apiFetch("/stars/purchase-premium", { method: "POST" });
              updateUser(updated);
              Alert.alert("Premium Activated!", "You now have TG Premium. Enjoy your perks!");
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally { setIsPurchasing(false); }
          },
        },
      ]
    );
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>TG Premium</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 20 }}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: colors.premium + "22" }]}>
          <Text style={[s.heroStar, { color: colors.premium }]}>★</Text>
          <Text style={[s.heroTitle, { color: colors.text }]}>Telegram Premium</Text>
          <Text style={[s.heroSubtitle, { color: colors.textSecondary }]}>
            Unlock exclusive features and enjoy the best of Telegram
          </Text>
        </View>

        {/* Stars balance */}
        <View style={[s.balanceCard, { backgroundColor: colors.surface }]}>
          <View style={s.balanceRow}>
            <Text style={[s.balanceStar, { color: colors.star }]}>★</Text>
            <View>
              <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Your Stars</Text>
              <Text style={[s.balanceValue, { color: colors.text }]}>{user?.stars || 0} Stars</Text>
            </View>
          </View>
          {user?.isPremium ? (
            <View style={[s.activeBadge, { backgroundColor: colors.success + "22" }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[s.activeBadgeText, { color: colors.success }]}>Active</Text>
            </View>
          ) : (
            <Text style={[s.costText, { color: colors.textSecondary }]}>{PREMIUM_COST} Stars required</Text>
          )}
        </View>

        {/* Perks */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>WHAT YOU GET</Text>
        <View style={[s.perksCard, { backgroundColor: colors.surface }]}>
          {PERKS.map((perk, i) => (
            <View key={i} style={[s.perkRow, i > 0 && [s.perkSep, { borderTopColor: colors.separator }]]}>
              <View style={[s.perkIcon, { backgroundColor: colors.premium + "22" }]}>
                <Ionicons name={perk.icon as any} size={20} color={colors.premium} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.perkTitle, { color: colors.text }]}>{perk.title}</Text>
                <Text style={[s.perkDesc, { color: colors.textSecondary }]}>{perk.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        {!user?.isPremium && (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Pressable
              style={({ pressed }) => [
                s.ctaBtn,
                { backgroundColor: canAfford ? colors.premium : colors.textTertiary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={purchasePremium}
              disabled={isPurchasing || !canAfford}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#1C1C1E" />
              ) : (
                <>
                  <Text style={s.ctaBtnText}>
                    {canAfford ? `Get Premium for ${PREMIUM_COST} Stars` : `Need ${PREMIUM_COST - (user?.stars || 0)} more Stars`}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  hero: { margin: 16, borderRadius: 20, padding: 32, alignItems: "center", gap: 8 },
  heroStar: { fontSize: 56 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  balanceCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  balanceStar: { fontSize: 32 },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  balanceValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  activeBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  costText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginHorizontal: 16, marginBottom: 6 },
  perksCard: {
    marginHorizontal: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  perkSep: { borderTopWidth: StyleSheet.hairlineWidth },
  perkIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  perkTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  perkDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  ctaBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: "center",
    shadowColor: "#FFD700", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  ctaBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1C1C1E" },
});

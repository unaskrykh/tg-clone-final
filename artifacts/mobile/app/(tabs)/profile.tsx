import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";

export default function ProfileScreen() {
  const { colors, fontSize } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const s = styles(colors, fontSize);

  function MenuItem({ icon, label, value, onPress, destructive = false }: any) {
    return (
      <Pressable
        style={({ pressed }) => [s.menuItem, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onPress}
      >
        <View style={[s.menuIcon, { backgroundColor: destructive ? colors.error + "22" : colors.primary + "22" }]}>
          <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.primary} />
        </View>
        <Text style={[s.menuLabel, { color: destructive ? colors.error : colors.text }]}>{label}</Text>
        {value && <Text style={s.menuValue}>{value}</Text>}
        {!destructive && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
      </Pressable>
    );
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>My Profile</Text>
        <Pressable onPress={() => router.push("/settings")} style={s.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Profile Card */}
      <View style={[s.profileCard, { backgroundColor: colors.surface }]}>
        <Avatar name={user?.displayName} avatarUrl={user?.avatarUrl} size={80} isPremium={user?.isPremium} emojiStatus={user?.emojiStatus} />
        <View style={s.profileInfo}>
          <View style={s.nameRow}>
            <Text style={s.displayName}>{user?.displayName || "User"}</Text>
            {user?.isPremium && (
              <View style={[s.premiumBadge, { backgroundColor: colors.premium }]}>
                <Text style={s.premiumBadgeText}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={s.username}>@{user?.username}</Text>
          {user?.bio && <Text style={s.bio}>{user.bio}</Text>}
        </View>
      </View>

      {/* Stars */}
      <View style={[s.starsCard, { backgroundColor: colors.surface }]}>
        <View style={s.starsRow}>
          <View style={s.starsLeft}>
            <Text style={[s.starsIcon, { color: colors.star }]}>★</Text>
            <View>
              <Text style={s.starsLabel}>Stars</Text>
              <Text style={[s.starsValue, { color: colors.text }]}>{user?.stars || 0} Stars</Text>
            </View>
          </View>
          <Pressable
            style={[s.premiumBtn, { backgroundColor: colors.premium }]}
            onPress={() => router.push("/premium")}
          >
            <Text style={s.premiumBtnText}>Get Premium</Text>
          </Pressable>
        </View>
      </View>

      {/* Menu */}
      <View style={[s.section, { backgroundColor: colors.surface }]}>
        <MenuItem icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} />
        <View style={[s.sep, { backgroundColor: colors.separator }]} />
        <MenuItem icon="gift-outline" label="TG Premium" onPress={() => router.push("/premium")} />
        <View style={[s.sep, { backgroundColor: colors.separator }]} />
        <MenuItem icon="happy-outline" label="Sticker Creator" onPress={() => router.push("/sticker-creator")} />
      </View>

      <View style={[s.section, { backgroundColor: colors.surface, marginTop: 16 }]}>
        <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} destructive />
      </View>
    </ScrollView>
  );
}

const styles = (colors: any, fontSize: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.text },
  settingsBtn: { padding: 4 },
  profileCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16, gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.text },
  premiumBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  premiumBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
  username: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 4 },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
  starsCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  starsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  starsLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  starsIcon: { fontSize: 32 },
  starsLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary },
  starsValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  premiumBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  premiumBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
  section: {
    marginHorizontal: 16, borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  menuIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginRight: 4 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
});

import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useApi } from "@/hooks/useApi";
import { Avatar } from "@/components/Avatar";

interface User {
  id: number;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isPremium: boolean;
  emojiStatus?: string;
  stars: number;
  createdAt?: string;
}

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors } = useTheme();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/users/${userId}`);
        setUser(data);
      } catch { setUser(null); } finally { setIsLoading(false); }
    })();
  }, [userId]);

  async function startDM() {
    try {
      const chat = await apiFetch("/chats", {
        method: "POST",
        body: JSON.stringify({ type: "dm", targetUserId: parseInt(userId) }),
      });
      router.push(`/chat/${chat.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  const s = styles(colors);

  if (isLoading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.textSecondary }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 20 }}>
        <View style={[s.profileHero, { backgroundColor: colors.surface }]}>
          <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={90} isPremium={user.isPremium} emojiStatus={user.emojiStatus} />
          <View style={s.nameRow}>
            <Text style={[s.displayName, { color: colors.text }]}>{user.displayName}</Text>
            {user.isPremium && (
              <View style={[s.premiumBadge, { backgroundColor: colors.premium }]}>
                <Text style={s.premiumText}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={[s.username, { color: colors.textSecondary }]}>@{user.username}</Text>
          {user.bio && <Text style={[s.bio, { color: colors.text }]}>{user.bio}</Text>}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={startDM}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <Text style={s.actionBtnText}>Send Message</Text>
          </Pressable>
        </View>
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
  profileHero: {
    alignItems: "center", padding: 24, gap: 8,
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  displayName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  premiumBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  premiumText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
  username: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 14,
    shadowColor: "#2AABEE", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, ActivityIndicator, Platform,
} from "react-native";
import { router } from "expo-router";
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
}

export default function ContactsScreen() {
  const { colors, fontSize } = useTheme();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); setHasSearched(false); return; }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await apiFetch(`/users/search?q=${encodeURIComponent(query.trim())}`);
      setResults(data);
    } catch { setResults([]); } finally { setIsSearching(false); }
  }, [apiFetch]);

  async function startDM(targetUser: User) {
    try {
      const chat = await apiFetch("/chats", {
        method: "POST",
        body: JSON.stringify({ type: "dm", targetUserId: targetUser.id }),
      });
      router.push(`/chat/${chat.id}`);
    } catch (e: any) {
      console.error("Start DM error:", e.message);
    }
  }

  const s = styles(colors, fontSize);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>People</Text>
      </View>

      <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search by @username"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={t => { setSearch(t); handleSearch(t); }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => { setSearch(""); setResults([]); setHasSearched(false); }}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {isSearching ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !hasSearched ? (
        <View style={s.placeholder}>
          <View style={[s.placeholderIcon, { backgroundColor: colors.secondaryBackground }]}>
            <Ionicons name="person-add-outline" size={40} color={colors.primary} />
          </View>
          <Text style={s.placeholderTitle}>Find People</Text>
          <Text style={s.placeholderText}>Search for users by their @username to start chatting</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.placeholder}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
          <Text style={s.placeholderTitle}>No results</Text>
          <Text style={s.placeholderText}>Try searching for a different username</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.userRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => startDM(item)}
            >
              <Avatar name={item.displayName} avatarUrl={item.avatarUrl} size={50} isPremium={item.isPremium} emojiStatus={item.emojiStatus} />
              <View style={s.userInfo}>
                <View style={s.nameRow}>
                  <Text style={s.displayName} numberOfLines={1}>{item.displayName}</Text>
                  {item.isPremium && (
                    <View style={[s.premiumTag, { backgroundColor: colors.premium }]}>
                      <Text style={s.premiumTagText}>Premium</Text>
                    </View>
                  )}
                </View>
                <Text style={s.username} numberOfLines={1}>@{item.username}</Text>
                {item.bio && <Text style={s.bio} numberOfLines={1}>{item.bio}</Text>}
              </View>
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => (
            <View style={[s.sep, { backgroundColor: colors.separator, marginLeft: 78 }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = (colors: any, fontSize: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.text },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 12, height: 38,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  placeholderIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  placeholderTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.text },
  placeholderText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" },
  userRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  displayName: { fontSize: fontSize.medium, fontFamily: "Inter_600SemiBold", color: colors.text },
  premiumTag: {
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  premiumTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#1C1C1E" },
  username: { fontSize: fontSize.small + 1, fontFamily: "Inter_400Regular", color: colors.textSecondary },
  bio: { fontSize: fontSize.small, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 1 },
  sep: { height: StyleSheet.hairlineWidth },
});

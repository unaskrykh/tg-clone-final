import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Avatar } from "@/components/Avatar";

interface Chat {
  id: number;
  type: "dm" | "group" | "channel";
  name?: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
  lastMessage?: {
    id: number;
    type: string;
    content?: string;
    sender?: { displayName: string };
    createdAt: string;
  };
  unreadCount?: number;
  otherUser?: { id: number; displayName: string; avatarUrl?: string; isPremium?: boolean; emojiStatus?: string };
  createdAt: string;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getLastMsgPreview(chat: Chat) {
  const lm = chat.lastMessage;
  if (!lm) return "No messages yet";
  if (lm.type === "text") return lm.content || "";
  if (lm.type === "image") return "📷 Photo";
  if (lm.type === "voice") return "🎤 Voice message";
  if (lm.type === "file") return "📎 File";
  if (lm.type === "sticker") return "🎭 Sticker";
  return "";
}

function getChatName(chat: Chat) {
  if (chat.type === "dm") return chat.otherUser?.displayName || "Unknown";
  return chat.name || "Unnamed";
}

export default function ChatsScreen() {
  const { colors, fontSize } = useTheme();
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 0;

  const loadChats = useCallback(async () => {
    try {
      const data = await apiFetch("/chats");
      setChats(data);
    } catch { /* ignore */ } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadChats(); }, [loadChats]);

  const filtered = chats.filter(c => {
    const name = getChatName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const s = styles(colors, fontSize);

  function renderChat({ item }: { item: Chat }) {
    const name = getChatName(item);
    const preview = getLastMsgPreview(item);
    const time = formatTime(item.lastMessage?.createdAt || item.createdAt);
    const isGroup = item.type === "group" || item.type === "channel";

    return (
      <Pressable
        style={({ pressed }) => [s.chatRow, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Avatar
          name={name}
          avatarUrl={item.type === "dm" ? item.otherUser?.avatarUrl : item.avatarUrl}
          size={52}
          isPremium={item.type === "dm" ? item.otherUser?.isPremium : false}
          emojiStatus={item.type === "dm" ? item.otherUser?.emojiStatus : undefined}
        />
        <View style={s.chatContent}>
          <View style={s.chatRow1}>
            <View style={s.chatNameRow}>
              {isGroup && (
                <Ionicons
                  name={item.type === "channel" ? "megaphone" : "people"}
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginRight: 3 }}
                />
              )}
              <Text style={s.chatName} numberOfLines={1}>{name}</Text>
            </View>
            <Text style={s.chatTime}>{time}</Text>
          </View>
          <View style={s.chatRow2}>
            <Text style={s.chatPreview} numberOfLines={1}>{preview}</Text>
            {(item.unreadCount || 0) > 0 && (
              <View style={[s.badge, { backgroundColor: colors.badge }]}>
                <Text style={s.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>Chats</Text>
        <View style={s.headerActions}>
          <Pressable style={s.headerBtn} onPress={() => router.push("/new-chat")}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderChat}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadChats(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={56} color={colors.textSecondary} />
              <Text style={s.emptyTitle}>No chats yet</Text>
              <Text style={s.emptySubtitle}>Start a conversation by tapping the compose button</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
          ItemSeparatorComponent={() => (
            <View style={[s.separator, { backgroundColor: colors.separator, marginLeft: 72 }]} />
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
  headerActions: { flexDirection: "row", gap: 12 },
  headerBtn: { padding: 4 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 12, height: 38,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  chatRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  chatContent: { flex: 1 },
  chatRow1: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  chatNameRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  chatName: { fontSize: fontSize.medium, fontFamily: "Inter_600SemiBold", color: colors.text, flex: 1 },
  chatTime: { fontSize: fontSize.small, fontFamily: "Inter_400Regular", color: colors.textSecondary },
  chatRow2: { flexDirection: "row", alignItems: "center" },
  chatPreview: { fontSize: fontSize.small + 1, fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  separator: { height: StyleSheet.hairlineWidth },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", color: colors.text },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" },
});

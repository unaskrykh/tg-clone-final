import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  FlatList, ActivityIndicator, Platform, Alert,
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
  avatarUrl?: string;
  isPremium: boolean;
  emojiStatus?: string;
}

type Mode = "dm" | "group" | "channel";

export default function NewChatScreen() {
  const { colors } = useTheme();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [mode, setMode] = useState<Mode>("dm");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function handleSearch(q: string) {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    setIsSearching(true);
    try {
      const data = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch { setResults([]); } finally { setIsSearching(false); }
  }

  function toggleUser(u: User) {
    if (mode === "dm") {
      setSelectedUsers([u]);
    } else {
      setSelectedUsers(prev =>
        prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
      );
    }
  }

  async function create() {
    if (selectedUsers.length === 0) { Alert.alert("Error", "Select at least one user"); return; }
    if (mode !== "dm" && !groupName.trim()) { Alert.alert("Error", "Enter a name for the group/channel"); return; }
    setIsCreating(true);
    try {
      let chat;
      if (mode === "dm") {
        chat = await apiFetch("/chats", {
          method: "POST",
          body: JSON.stringify({ type: "dm", targetUserId: selectedUsers[0].id }),
        });
      } else {
        chat = await apiFetch("/chats", {
          method: "POST",
          body: JSON.stringify({ type: mode, name: groupName.trim(), memberIds: selectedUsers.map(u => u.id) }),
        });
      }
      router.replace(`/chat/${chat.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setIsCreating(false); }
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>New Message</Text>
        {selectedUsers.length > 0 && (
          <Pressable onPress={create} disabled={isCreating} style={s.createBtn}>
            {isCreating ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={[s.createText, { color: colors.primary }]}>Create</Text>}
          </Pressable>
        )}
      </View>

      {/* Mode tabs */}
      <View style={[s.modeTabs, { backgroundColor: colors.secondaryBackground }]}>
        {(["dm", "group", "channel"] as Mode[]).map(m => (
          <Pressable
            key={m}
            style={[s.modeTab, mode === m && [s.modeTabActive, { backgroundColor: colors.primary }]]}
            onPress={() => { setMode(m); setSelectedUsers([]); }}
          >
            <Text style={[s.modeTabText, { color: mode === m ? "#fff" : colors.textSecondary }]}>
              {m === "dm" ? "Direct" : m === "group" ? "Group" : "Channel"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Group/Channel name */}
      {mode !== "dm" && (
        <View style={[s.nameInput, { backgroundColor: colors.inputBackground }]}>
          <TextInput
            style={[s.nameTextInput, { color: colors.text }]}
            placeholder={mode === "group" ? "Group Name" : "Channel Name"}
            placeholderTextColor={colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>
      )}

      {/* Selected */}
      {selectedUsers.length > 0 && mode !== "dm" && (
        <View style={s.selectedRow}>
          {selectedUsers.map(u => (
            <Pressable
              key={u.id}
              style={[s.selectedChip, { backgroundColor: colors.primary + "22" }]}
              onPress={() => toggleUser(u)}
            >
              <Text style={[s.selectedChipText, { color: colors.primary }]}>{u.displayName}</Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search @username"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isSearching ? (
        <View style={s.centered}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => {
            const isSelected = !!selectedUsers.find(u => u.id === item.id);
            return (
              <Pressable
                style={({ pressed }) => [s.userRow, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => toggleUser(item)}
              >
                <Avatar name={item.displayName} avatarUrl={item.avatarUrl} size={46} isPremium={item.isPremium} />
                <View style={s.userInfo}>
                  <Text style={[s.displayName, { color: colors.text }]}>{item.displayName}</Text>
                  <Text style={[s.username, { color: colors.textSecondary }]}>@{item.username}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </Pressable>
            );
          }}
          ListEmptyComponent={search ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No users found</Text>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 12,
  },
  closeBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold" },
  createBtn: { padding: 4 },
  createText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modeTabs: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 3,
  },
  modeTab: { flex: 1, borderRadius: 10, paddingVertical: 7, alignItems: "center" },
  modeTabActive: {},
  modeTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  nameInput: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, paddingHorizontal: 16, height: 48,
    justifyContent: "center",
  },
  nameTextInput: { fontSize: 16, fontFamily: "Inter_400Regular" },
  selectedRow: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, marginBottom: 8, gap: 6,
  },
  selectedChip: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, gap: 4,
  },
  selectedChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 12, height: 38,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  userRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  userInfo: { flex: 1 },
  displayName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 13, fontFamily: "Inter_400Regular" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  empty: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});

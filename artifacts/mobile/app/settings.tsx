import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";

const THEMES = ["default", "light", "dark"];
const FONT_SIZES = ["small", "medium", "large"];
const EMOJI_STATUSES = ["", "🔥", "💎", "⚡", "🎯", "🌟", "🚀", "🎮", "🏆", "❤️"];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [theme, setTheme] = useState(user?.theme || "default");
  const [fontSizeKey, setFontSizeKey] = useState(user?.fontSize || "medium");
  const [emojiStatus, setEmojiStatus] = useState(user?.emojiStatus || "");
  const [isSaving, setIsSaving] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  async function handleSave() {
    if (!displayName.trim()) { Alert.alert("Error", "Display name cannot be empty"); return; }
    setIsSaving(true);
    try {
      const updated = await apiFetch("/users/me/settings", {
        method: "PUT",
        body: JSON.stringify({ displayName: displayName.trim(), bio: bio.trim(), theme, fontSize: fontSizeKey, emojiStatus }),
      });
      updateUser(updated);
      Alert.alert("Saved", "Settings updated successfully");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setIsSaving(false); }
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Settings</Text>
        <Pressable onPress={handleSave} disabled={isSaving} style={s.saveBtn}>
          {isSaving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={[s.saveText, { color: colors.primary }]}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 20, paddingHorizontal: 16 }}>

        {/* Profile Section */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>PROFILE</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Display Name</Text>
          <TextInput
            style={[s.fieldInput, { color: colors.text, borderBottomColor: colors.separator }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your Name"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[s.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>Bio</Text>
          <TextInput
            style={[s.fieldInput, { color: colors.text, borderBottomColor: colors.separator, height: 64 }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell something about yourself..."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </View>

        {/* Emoji Status (Premium only) */}
        {user?.isPremium && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>EMOJI STATUS</Text>
            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <View style={s.emojiGrid}>
                {EMOJI_STATUSES.map(em => (
                  <Pressable
                    key={em || "none"}
                    style={[s.emojiBtn, emojiStatus === em && [s.emojiBtnActive, { borderColor: colors.primary }]]}
                    onPress={() => setEmojiStatus(em)}
                  >
                    <Text style={s.emojiText}>{em || "∅"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Theme */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>THEME</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {THEMES.map(t => (
            <Pressable
              key={t}
              style={[s.optionRow]}
              onPress={() => setTheme(t)}
            >
              <View style={[s.optionIcon, { backgroundColor: t === "dark" ? "#1C1C1E" : t === "light" ? "#FFFFFF" : colors.primary + "22", borderWidth: 1, borderColor: colors.separator }]}>
                <Ionicons name={t === "dark" ? "moon" : t === "light" ? "sunny" : "phone-portrait"} size={16} color={t === "dark" ? "#fff" : t === "light" ? "#FF9500" : colors.primary} />
              </View>
              <Text style={[s.optionLabel, { color: colors.text }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              {theme === t && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>

        {/* Font Size */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>FONT SIZE</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {FONT_SIZES.map(f => (
            <Pressable key={f} style={s.optionRow} onPress={() => setFontSizeKey(f)}>
              <Text style={[s.optionLabel, { color: colors.text }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {fontSizeKey === f && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </Pressable>
          ))}
        </View>

        {/* Admin Panel */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>ADVANCED</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Pressable style={s.optionRow} onPress={() => router.push("/admin")}>
            <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
            <Text style={[s.optionLabel, { color: colors.textSecondary }]}>Admin Panel</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Inter_600SemiBold" },
  saveBtn: { padding: 4 },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginTop: 20, marginBottom: 6 },
  card: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, marginBottom: 4 },
  fieldInput: {
    fontSize: 16, fontFamily: "Inter_400Regular",
    borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8, marginBottom: 4,
  },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.secondaryBackground,
    borderWidth: 2, borderColor: "transparent",
  },
  emojiBtnActive: {},
  emojiText: { fontSize: 22 },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator,
  },
  optionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  optionLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium" },
});

import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, Image, FlatList, ActivityIndicator, Alert, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";

interface StickerItem {
  uri: string;
  emoji: string;
}

export default function StickerCreatorScreen() {
  const { colors } = useTheme();
  const { user, token } = useAuth();
  const { apiFetch, apiBase } = useApi();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [packName, setPackName] = useState("");
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  async function addSticker() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setStickers(prev => [...prev, { uri: asset.uri, emoji: "" }]);
  }

  function updateEmoji(index: number, emoji: string) {
    setStickers(prev => prev.map((s, i) => i === index ? { ...s, emoji } : s));
  }

  function removeSticker(index: number) {
    setStickers(prev => prev.filter((_, i) => i !== index));
  }

  async function createPack() {
    if (!packName.trim()) { Alert.alert("Error", "Enter a pack name"); return; }
    if (stickers.length === 0) { Alert.alert("Error", "Add at least one sticker"); return; }
    setIsCreating(true);
    try {
      // Upload all images first
      const uploadedStickers = await Promise.all(stickers.map(async (s) => {
        const formData = new FormData();
        formData.append("file", { uri: s.uri, name: "sticker.jpg", type: "image/jpeg" } as any);
        const res = await fetch(`${apiBase}/files/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        return { imageUrl: data.url, emoji: s.emoji || undefined };
      }));

      await apiFetch("/stickers", {
        method: "POST",
        body: JSON.stringify({ name: packName.trim(), stickers: uploadedStickers }),
      });

      Alert.alert("Sticker Pack Created!", `"${packName}" has been created successfully!`);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setIsCreating(false); }
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Sticker Creator</Text>
        <Pressable onPress={createPack} disabled={isCreating} style={s.createBtn}>
          {isCreating ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={[s.createText, { color: colors.primary }]}>Create</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20, gap: 16 }}>
        {/* Pack Name */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.label, { color: colors.textSecondary }]}>PACK NAME</Text>
          <TextInput
            style={[s.nameInput, { color: colors.text, borderBottomColor: colors.separator }]}
            placeholder="My Sticker Pack"
            placeholderTextColor={colors.textSecondary}
            value={packName}
            onChangeText={setPackName}
          />
        </View>

        {/* Stickers */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>STICKERS ({stickers.length})</Text>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {stickers.map((sticker, i) => (
            <View key={i} style={[s.stickerRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
              <Image source={{ uri: sticker.uri }} style={s.stickerPreview} />
              <TextInput
                style={[s.emojiInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                placeholder="emoji"
                placeholderTextColor={colors.textSecondary}
                value={sticker.emoji}
                onChangeText={t => updateEmoji(i, t)}
                maxLength={2}
              />
              <Pressable onPress={() => removeSticker(i)} style={s.removeBtn}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}

          <Pressable
            style={[s.addStickerBtn, { borderColor: colors.primary + "44" }]}
            onPress={addSticker}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
            <Text style={[s.addStickerText, { color: colors.primary }]}>Add Image</Text>
          </Pressable>
        </View>

        <Text style={[s.hint, { color: colors.textSecondary }]}>
          Upload images from your gallery to create stickers. Optionally add an emoji for each sticker.
        </Text>
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
  closeBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold" },
  createBtn: { padding: 4 },
  createText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
  nameInput: {
    fontSize: 18, fontFamily: "Inter_600SemiBold",
    borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8,
  },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  stickerRow: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingVertical: 10,
  },
  stickerPreview: {
    width: 60, height: 60, borderRadius: 10,
    backgroundColor: colors.secondaryBackground,
  },
  emojiInput: {
    width: 48, height: 48, borderRadius: 10,
    textAlign: "center", fontSize: 24,
  },
  removeBtn: { padding: 4 },
  addStickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
    paddingVertical: 16, marginTop: 8,
  },
  addStickerText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});

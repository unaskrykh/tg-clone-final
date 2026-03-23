import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface AvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: number;
  isPremium?: boolean;
  emojiStatus?: string;
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

function getAvatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, avatarUrl, size = 50, isPremium, emojiStatus }: AvatarProps) {
  const { colors } = useTheme();
  const bgColor = getAvatarColor(name);
  const fontSize = size * 0.36;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
          <Text style={[styles.initials, { fontSize, color: "#fff" }]}>{getInitials(name)}</Text>
        </View>
      )}
      {isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: colors.premium }]}>
          <Text style={styles.premiumIcon}>★</Text>
        </View>
      )}
      {emojiStatus && (
        <View style={styles.emojiStatus}>
          <Text style={[styles.emojiText, { fontSize: size * 0.28 }]}>{emojiStatus}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  image: { resizeMode: "cover" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: "Inter_600SemiBold" },
  premiumBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },
  premiumIcon: { fontSize: 9, color: "#1C1C1E" },
  emojiStatus: {
    position: "absolute", bottom: -4, right: -4,
    width: 20, height: 20, alignItems: "center", justifyContent: "center",
  },
  emojiText: { lineHeight: 20 },
});

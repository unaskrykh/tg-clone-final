import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export default function AdminScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  async function handleAdminLogin() {
    if (!password) { Alert.alert("Error", "Enter admin password"); return; }
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid password");
      setAdminToken(data.token);
      setPassword("");
      Alert.alert("Access Granted", "Admin panel unlocked");
    } catch (e: any) {
      Alert.alert("Access Denied", e.message);
    } finally { setIsLoggingIn(false); }
  }

  async function modifyStars(action: "add" | "remove") {
    const amt = parseInt(amount);
    if (!username.trim() || !amt || amt <= 0) {
      Alert.alert("Error", "Enter valid username and amount");
      return;
    }
    setIsModifying(true);
    try {
      const finalAmount = action === "add" ? amt : -amt;
      const res = await fetch(`${API_BASE}/admin/stars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), amount: finalAmount, adminToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setLastResult(`Success! @${data.username} now has ${data.stars} Stars`);
      setUsername("");
      setAmount("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setIsModifying(false); }
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={s.headerCenter}>
          <Ionicons name="shield" size={20} color={colors.error} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Admin Panel</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20, gap: 16 }}>
        {!adminToken ? (
          <View style={[s.card, { backgroundColor: colors.surface }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Enter Admin Password</Text>
            <View style={[s.inputRow, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[s.textInput, { color: colors.text }]}
                placeholder="Admin password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleAdminLogin}
              />
            </View>
            <Pressable
              style={[s.btn, { backgroundColor: colors.primary }]}
              onPress={handleAdminLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Unlock</Text>}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[s.accessBanner, { backgroundColor: colors.success + "22" }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[s.accessText, { color: colors.success }]}>Admin Access Granted</Text>
            </View>

            <View style={[s.card, { backgroundColor: colors.surface }]}>
              <Text style={[s.cardTitle, { color: colors.text }]}>Manage Stars</Text>
              <Text style={[s.cardDesc, { color: colors.textSecondary }]}>Add or remove Stars for any user by @username</Text>

              <View style={[s.inputRow, { backgroundColor: colors.inputBackground, marginTop: 12 }]}>
                <Text style={[s.atSign, { color: colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[s.textInput, { color: colors.text }]}
                  placeholder="username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  autoCapitalize="none"
                />
              </View>

              <View style={[s.inputRow, { backgroundColor: colors.inputBackground, marginTop: 8 }]}>
                <Text style={[s.starIcon, { color: colors.star }]}>★</Text>
                <TextInput
                  style={[s.textInput, { color: colors.text }]}
                  placeholder="Amount of Stars"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={t => setAmount(t.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                />
              </View>

              <View style={s.actionRow}>
                <Pressable
                  style={[s.actionBtn, { backgroundColor: colors.success }]}
                  onPress={() => modifyStars("add")}
                  disabled={isModifying}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={s.actionBtnText}>Add Stars</Text>
                </Pressable>
                <Pressable
                  style={[s.actionBtn, { backgroundColor: colors.error }]}
                  onPress={() => modifyStars("remove")}
                  disabled={isModifying}
                >
                  {isModifying ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="remove" size={18} color="#fff" />
                      <Text style={s.actionBtnText}>Remove Stars</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {lastResult ? (
                <View style={[s.resultBox, { backgroundColor: colors.success + "22" }]}>
                  <Text style={[s.resultText, { color: colors.success }]}>{lastResult}</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              style={[s.logoutBtn, { borderColor: colors.separator }]}
              onPress={() => { setAdminToken(""); setLastResult(""); }}
            >
              <Text style={[s.logoutText, { color: colors.error }]}>Lock Admin Panel</Text>
            </Pressable>
          </>
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
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, paddingHorizontal: 14, height: 48, gap: 8,
  },
  atSign: { fontSize: 18, fontFamily: "Inter_500Medium" },
  starIcon: { fontSize: 20 },
  textInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  btn: {
    borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  accessBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12,
  },
  accessText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, borderRadius: 12, height: 46,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 6,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultBox: { borderRadius: 10, padding: 12 },
  resultText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  logoutBtn: {
    borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center",
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

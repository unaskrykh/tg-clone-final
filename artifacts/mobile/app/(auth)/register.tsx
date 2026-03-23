import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const displayRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function handleRegister() {
    if (!username.trim() || !displayName.trim() || !password.trim()) {
      Alert.alert("Error", "Username, display name, and password are required");
      return;
    }
    if (!/^[a-z0-9_]{3,32}$/.test(username.trim())) {
      Alert.alert("Error", "Username must be 3-32 chars, only letters, numbers, underscores");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      await register(username.trim(), displayName.trim(), password, bio.trim() || undefined);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>

          <Text style={[s.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>Join Telegram today</Text>

          <View style={s.form}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>USERNAME *</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.inputBackground }]}>
                <Text style={[s.atSign, { color: colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  placeholder="your_username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => displayRef.current?.focus()}
                />
              </View>
            </View>

            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>DISPLAY NAME *</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.inputBackground }]}>
                <TextInput
                  ref={displayRef}
                  style={[s.input, { color: colors.text }]}
                  placeholder="Your Name"
                  placeholderTextColor={colors.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  returnKeyType="next"
                  onSubmitEditing={() => bioRef.current?.focus()}
                />
              </View>
            </View>

            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>BIO (optional)</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.inputBackground, height: 80, alignItems: "flex-start", paddingTop: 12 }]}>
                <TextInput
                  ref={bioRef}
                  style={[s.input, { color: colors.text }]}
                  placeholder="Tell something about yourself..."
                  placeholderTextColor={colors.textSecondary}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>PASSWORD *</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.inputBackground }]}>
                <TextInput
                  ref={passwordRef}
                  style={[s.input, { color: colors.text, flex: 1 }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>CONFIRM PASSWORD *</Text>
              <View style={[s.inputWrapper, { backgroundColor: colors.inputBackground }]}>
                <TextInput
                  ref={confirmRef}
                  style={[s.input, { color: colors.text }]}
                  placeholder="Repeat password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [s.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Create Account</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 24 },
  form: { gap: 14 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingHorizontal: 16, height: 56,
  },
  atSign: { fontSize: 18, marginRight: 4, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    height: 56, borderRadius: 14, alignItems: "center",
    justifyContent: "center", marginTop: 8,
    shadowColor: "#2AABEE", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

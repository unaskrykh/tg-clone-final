import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import { io as connectSocket, Socket } from "socket.io-client";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Avatar } from "@/components/Avatar";

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  sender?: { id: number; displayName: string; avatarUrl?: string; isPremium?: boolean };
  type: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  replyToId?: number;
  replyTo?: Message;
  isDeleted?: boolean;
  createdAt: string;
}

interface ChatInfo {
  id: number;
  type: string;
  name?: string;
  otherUser?: { id: number; displayName: string; avatarUrl?: string; isPremium?: boolean; emojiStatus?: string };
  memberCount: number;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(s?: number) {
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fileSizeStr(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { colors, fontSize } = useTheme();
  const { user, token } = useAuth();
  const { apiFetch, apiBase } = useApi();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";

  const id = parseInt(chatId);

  const loadData = useCallback(async () => {
    try {
      const [chatData, msgs] = await Promise.all([
        apiFetch(`/chats/${id}`),
        apiFetch(`/messages/${id}?limit=50`),
      ]);
      setChat(chatData);
      setMessages(msgs);
    } catch { /* ignore */ } finally { setIsLoading(false); }
  }, [id, apiFetch]);

  useEffect(() => {
    loadData();

    // Setup socket
    const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
    const socket = connectSocket(`https://${domain}`, {
      auth: { token },
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_chat", id);
    });

    socket.on("new_message", (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("message_deleted", ({ messageId }: { messageId: number }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true } : m));
    });

    socket.on("user_typing", ({ userId: uid, isTyping }: { userId: number; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(uid); else next.delete(uid);
        return next;
      });
    });

    return () => {
      socket.emit("leave_chat", id);
      socket.disconnect();
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [id, token]);

  async function sendMessage(type: string, extra: Partial<Message> = {}) {
    const content = type === "text" ? inputText.trim() : undefined;
    if (type === "text" && !content) return;
    setIsSending(true);
    setInputText("");
    setReplyTo(null);
    try {
      await apiFetch(`/messages/${id}`, {
        method: "POST",
        body: JSON.stringify({ type, content, replyToId: replyTo?.id, ...extra }),
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSending(false);
    }
  }

  async function pickImage() {
    setShowAttachMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("file", { uri: asset.uri, name: "photo.jpg", type: "image/jpeg" } as any);
    try {
      const res = await fetch(`${apiBase}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      await sendMessage("image", { fileUrl: data.url, fileName: data.fileName, fileSize: data.fileSize });
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    }
  }

  async function pickDocument() {
    setShowAttachMenu(false);
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    const file = result.assets[0];
    const formData = new FormData();
    formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
    try {
      const res = await fetch(`${apiBase}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      await sendMessage("file", { fileUrl: data.url, fileName: file.name, fileSize: file.size });
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    }
  }

  async function startRecording() {
    if (Platform.OS === "web") { Alert.alert("Voice messages not available on web"); return; }
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) { Alert.alert("Permission denied", "Microphone permission required"); return; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    setIsRecording(true);
    setRecordingDuration(0);
    recordingTimer.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    setIsRecording(false);
    const dur = recordingDuration;
    setRecordingDuration(0);
    if (!uri) return;
    const formData = new FormData();
    formData.append("file", { uri, name: "voice.m4a", type: "audio/m4a" } as any);
    try {
      const res = await fetch(`${apiBase}/files/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      await sendMessage("voice", { fileUrl: data.url, duration: dur });
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    }
  }

  function handleTyping(text: string) {
    setInputText(text);
    socketRef.current?.emit("typing", { chatId: id, isTyping: text.length > 0 });
  }

  function deleteMessage(msg: Message) {
    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/messages/${id}/${msg.id}`, { method: "DELETE" });
          } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  }

  const s = styles(colors, fontSize);

  const getChatTitle = () => {
    if (!chat) return "Chat";
    if (chat.type === "dm") return chat.otherUser?.displayName || "Unknown";
    return chat.name || "Group";
  };

  const getChatSubtitle = () => {
    if (!chat) return "";
    if (chat.type === "dm") return typingUsers.size > 0 ? "typing..." : "online";
    return `${chat.memberCount} members${typingUsers.size > 0 ? " · typing..." : ""}`;
  };

  function renderMessage({ item }: { item: Message }) {
    const isMine = item.senderId === user?.id;
    if (item.isDeleted) {
      return (
        <View style={[s.msgRow, isMine ? s.msgRowRight : s.msgRowLeft]}>
          <View style={[s.bubble, isMine ? [s.bubbleSent, { backgroundColor: colors.messageBubbleSent }] : [s.bubbleReceived, { backgroundColor: colors.messageBubbleReceived }]]}>
            <Text style={[s.deletedText, { color: isMine ? "rgba(255,255,255,0.6)" : colors.textSecondary }]}>Message deleted</Text>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        style={[s.msgRow, isMine ? s.msgRowRight : s.msgRowLeft]}
        onLongPress={() => {
          if (isMine) {
            Alert.alert("Message Options", "", [
              { text: "Reply", onPress: () => setReplyTo(item) },
              { text: "Delete", style: "destructive", onPress: () => deleteMessage(item) },
              { text: "Cancel", style: "cancel" },
            ]);
          } else {
            setReplyTo(item);
          }
        }}
      >
        {!isMine && (
          <Avatar name={item.sender?.displayName} avatarUrl={item.sender?.avatarUrl} size={32} />
        )}
        <View style={[s.bubble, isMine ? [s.bubbleSent, { backgroundColor: colors.messageBubbleSent }] : [s.bubbleReceived, { backgroundColor: colors.messageBubbleReceived }], { maxWidth: "75%" }]}>
          {!isMine && chat?.type !== "dm" && (
            <Text style={[s.senderName, { color: colors.primary }]}>{item.sender?.displayName}</Text>
          )}
          {item.replyTo && (
            <View style={[s.replyPreview, { borderLeftColor: isMine ? "rgba(255,255,255,0.5)" : colors.primary, backgroundColor: isMine ? "rgba(0,0,0,0.1)" : colors.secondaryBackground }]}>
              <Text style={[s.replyName, { color: isMine ? "rgba(255,255,255,0.8)" : colors.primary }]} numberOfLines={1}>{item.replyTo.sender?.displayName}</Text>
              <Text style={[s.replyContent, { color: isMine ? "rgba(255,255,255,0.7)" : colors.textSecondary }]} numberOfLines={1}>{item.replyTo.content || "[media]"}</Text>
            </View>
          )}
          {item.type === "text" && (
            <Text style={[s.msgText, { color: isMine ? colors.messageSentText : colors.messageReceivedText }]}>{item.content}</Text>
          )}
          {item.type === "image" && item.fileUrl && (
            <Image source={{ uri: item.fileUrl.startsWith("/") ? `https://${process.env.EXPO_PUBLIC_DOMAIN}${item.fileUrl}` : item.fileUrl }} style={s.msgImage} resizeMode="cover" />
          )}
          {item.type === "file" && (
            <View style={s.fileRow}>
              <Ionicons name="document-outline" size={28} color={isMine ? "#fff" : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.fileName, { color: isMine ? "#fff" : colors.text }]} numberOfLines={1}>{item.fileName}</Text>
                <Text style={[s.fileSize, { color: isMine ? "rgba(255,255,255,0.7)" : colors.textSecondary }]}>{fileSizeStr(item.fileSize)}</Text>
              </View>
            </View>
          )}
          {item.type === "voice" && (
            <View style={s.voiceRow}>
              <Ionicons name="play" size={20} color={isMine ? "#fff" : colors.primary} />
              <View style={[s.voiceBar, { backgroundColor: isMine ? "rgba(255,255,255,0.3)" : colors.separator }]}>
                <View style={[s.voiceProgress, { backgroundColor: isMine ? "#fff" : colors.primary, width: "40%" }]} />
              </View>
              <Text style={[s.voiceDuration, { color: isMine ? "#fff" : colors.text }]}>{formatDuration(item.duration)}</Text>
            </View>
          )}
          <Text style={[s.msgTime, { color: isMine ? "rgba(255,255,255,0.7)" : colors.textSecondary }]}>
            {formatTime(item.createdAt)}
            {isMine && " ✓✓"}
          </Text>
        </View>
      </Pressable>
    );
  }

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 4, backgroundColor: colors.surface }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        {chat?.type === "dm" && chat.otherUser && (
          <Avatar name={chat.otherUser.displayName} avatarUrl={chat.otherUser.avatarUrl} size={36} emojiStatus={chat.otherUser.emojiStatus} />
        )}
        <Pressable style={s.headerInfo} onPress={() => chat?.type === "dm" && chat.otherUser && router.push(`/profile/${chat.otherUser.id}`)}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{getChatTitle()}</Text>
          <Text style={[s.headerSubtitle, { color: colors.primary }]} numberOfLines={1}>{getChatSubtitle()}</Text>
        </Pressable>
        <Pressable style={s.headerBtn}>
          <Ionicons name="call-outline" size={22} color={colors.primary} />
        </Pressable>
        <Pressable style={s.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 8, paddingBottom: 8 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {/* Reply banner */}
        {replyTo && (
          <View style={[s.replyBanner, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
            <View style={[s.replyBannerLine, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.replyBannerName, { color: colors.primary }]}>{replyTo.sender?.displayName || "You"}</Text>
              <Text style={[s.replyBannerText, { color: colors.textSecondary }]} numberOfLines={1}>{replyTo.content || "[media]"}</Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {/* Attach menu */}
        {showAttachMenu && (
          <View style={[s.attachMenu, { backgroundColor: colors.surface, borderTopColor: colors.separator }]}>
            <Pressable style={s.attachItem} onPress={pickImage}>
              <View style={[s.attachIcon, { backgroundColor: "#5B85DD" }]}>
                <Ionicons name="image-outline" size={22} color="#fff" />
              </View>
              <Text style={[s.attachLabel, { color: colors.text }]}>Photo</Text>
            </Pressable>
            <Pressable style={s.attachItem} onPress={pickDocument}>
              <View style={[s.attachIcon, { backgroundColor: "#4CAF50" }]}>
                <Ionicons name="document-outline" size={22} color="#fff" />
              </View>
              <Text style={[s.attachLabel, { color: colors.text }]}>File</Text>
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View style={[s.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.separator, paddingBottom: bottomPad + 4 }]}>
          <Pressable onPress={() => setShowAttachMenu(v => !v)} style={s.inputBtn}>
            <Ionicons name="attach" size={24} color={colors.textSecondary} />
          </Pressable>
          {isRecording ? (
            <View style={[s.recordingBar, { backgroundColor: colors.inputBackground }]}>
              <View style={[s.recordingDot, { backgroundColor: colors.error }]} />
              <Text style={[s.recordingText, { color: colors.text }]}>{formatDuration(recordingDuration)}</Text>
              <Text style={[s.recordingHint, { color: colors.textSecondary }]}>Recording...</Text>
            </View>
          ) : (
            <TextInput
              ref={inputRef}
              style={[s.textInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
              placeholder="Message"
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={handleTyping}
              multiline
              maxLength={4096}
              returnKeyType="default"
            />
          )}
          {inputText.trim() ? (
            <Pressable
              onPress={() => sendMessage("text")}
              style={({ pressed }) => [s.sendBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              disabled={isSending}
            >
              {isSending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </Pressable>
          ) : (
            <Pressable
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={({ pressed }) => [s.micBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name={isRecording ? "stop-circle" : "mic-outline"} size={24} color={isRecording ? colors.error : colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (colors: any, fontSize: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingBottom: 10, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
  },
  backBtn: { padding: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerBtn: { padding: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2, gap: 6 },
  msgRowRight: { justifyContent: "flex-end" },
  msgRowLeft: { justifyContent: "flex-start" },
  bubble: { borderRadius: 18, padding: 10, maxWidth: "78%", gap: 4 },
  bubbleSent: { borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  replyPreview: {
    borderLeftWidth: 3, borderRadius: 4,
    paddingLeft: 8, paddingVertical: 4, marginBottom: 4,
  },
  replyName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  replyContent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  msgText: { fontSize: fontSize.medium, fontFamily: "Inter_400Regular", lineHeight: fontSize.medium * 1.4 },
  msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", alignSelf: "flex-end" },
  deletedText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  msgImage: { width: 200, height: 200, borderRadius: 12 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 160 },
  fileName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fileSize: { fontSize: 11, fontFamily: "Inter_400Regular" },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 160 },
  voiceBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  voiceProgress: { height: "100%", borderRadius: 2 },
  voiceDuration: { fontSize: 12, fontFamily: "Inter_400Regular" },
  replyBanner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  replyBannerLine: { width: 3, height: 36, borderRadius: 2 },
  replyBannerName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  replyBannerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attachMenu: {
    flexDirection: "row", padding: 16, gap: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachItem: { alignItems: "center", gap: 6 },
  attachIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  attachLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  inputBtn: { padding: 8, marginBottom: 4 },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 120,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: fontSize.medium, fontFamily: "Inter_400Regular",
  },
  recordingBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderRadius: 20, paddingHorizontal: 14, height: 40, gap: 8,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  recordingText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  recordingHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  micBtn: { padding: 8, marginBottom: 4 },
});

import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  Button,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Canvas } from "./components/Canvas";
import { RoomHistory } from "./components/RoomHistory";
import { getDisplayName, setDisplayName } from "./lib/displayName";
import {
  createRoom,
  getRoomDetails,
  recordRoomMembership,
  roomExists,
  updateRoomName,
} from "./lib/rooms";
import { getOrCreateUserId } from "./lib/userId";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomMembers, setRoomMembers] = useState<string[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    getOrCreateUserId().then(setUserId);
    getDisplayName().then(setDisplayNameState);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    getRoomDetails(roomId).then((details) => {
      if (!details) return;
      setRoomName(details.name);
      setRoomMembers(details.members);
    });
  }, [roomId]);

  async function handleSaveName() {
    const name = nameDraft.trim();
    if (!name) return;
    await setDisplayName(name);
    setDisplayNameState(name);
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (!displayName) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gate}>
          <Text style={styles.title}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="Screen name"
            value={nameDraft}
            onChangeText={setNameDraft}
            autoCapitalize="words"
          />
          <Button title="Continue" onPress={handleSaveName} />
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  async function handleCreate() {
    if (!userId || !displayName) return;
    setError(null);
    const { data, error } = await createRoom(`${displayName}'s Canvas`);
    if (error || !data) {
      setError(error?.message ?? "Could not create room");
      return;
    }
    await recordRoomMembership(data.id, userId, displayName);
    setRoomId(data.id);
  }

  async function handleJoin() {
    if (!userId || !displayName) return;
    setError(null);
    const id = joinCode.trim();
    if (!id) return;
    const { exists, error } = await roomExists(id);
    if (error || !exists) {
      setError("Room not found");
      return;
    }
    await recordRoomMembership(id, userId, displayName);
    setRoomId(id);
  }

  function handleRenameCanvas() {
    if (!roomId) return;
    Alert.prompt(
      "Rename canvas",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (name: string | undefined) => {
            const trimmed = name?.trim();
            if (!trimmed) return;
            updateRoomName(roomId, trimmed);
            setRoomName(trimmed);
          },
        },
      ],
      "plain-text",
      roomName,
    );
  }

  if (roomId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.canvasHeader}>
          <Pressable onPress={() => setRoomId(null)} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#6b7280" />
          </Pressable>
          <Pressable style={styles.headerCenter} onPress={handleRenameCanvas}>
            <Text style={styles.canvasName} numberOfLines={1}>
              {roomName}
            </Text>
            {roomMembers.length > 0 && (
              <Text style={styles.memberNames} numberOfLines={1}>
                {roomMembers.join(" · ")}
              </Text>
            )}
          </Pressable>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              Share.share({
                message: `Join my DuoCanvas room! Code: ${roomId}`,
              })
            }
          >
            <MaterialCommunityIcons name="share-variant" size={22} color="#6b7280" />
          </Pressable>
        </View>
        <Canvas key={roomId} roomId={roomId} userId={userId} />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (showHistory) {
    return (
      <SafeAreaView style={styles.container}>
        <RoomHistory
          userId={userId}
          onSelectRoom={(id) => {
            setShowHistory(false);
            setRoomId(id);
          }}
          onClose={() => setShowHistory(false)}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gate}>
        <Text style={styles.title}>DuoCanvas</Text>
        <Button title="Create a new room" onPress={handleCreate} />
        <Text style={styles.or}>— or —</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter room code"
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="none"
        />
        <Button title="Join room" onPress={handleJoin} />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <Pressable style={styles.historyButton} onPress={() => setShowHistory(true)}>
        <Text style={styles.historyButtonText}>History</Text>
      </Pressable>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  canvasHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  canvasName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  memberNames: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 1,
  },
  gate: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  or: {
    color: "#999",
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    width: "100%",
  },
  error: {
    color: "red",
    marginTop: 8,
  },
  historyButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  historyButtonText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "600",
  },
});

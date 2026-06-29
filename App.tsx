import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Canvas } from "./components/Canvas";
import { generateId } from "./lib/id";
import { createRoom, roomExists } from "./lib/rooms";

const userId = generateId("user-");

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    const { data, error } = await createRoom();
    if (error || !data) {
      setError(error?.message ?? "Could not create room");
      return;
    }
    setRoomId(data.id);
  }

  async function handleJoin() {
    setError(null);
    const id = joinCode.trim();
    if (!id) return;
    const { exists, error } = await roomExists(id);
    if (error || !exists) {
      setError("Room not found");
      return;
    }
    setRoomId(id);
  }

  if (roomId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.roomLabel}>Room: {roomId}</Text>
        <Canvas roomId={roomId} userId={userId} />
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
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  roomLabel: {
    textAlign: "center",
    paddingVertical: 8,
    color: "#666",
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
});

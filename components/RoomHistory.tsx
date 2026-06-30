/** @format */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { deleteRoom, getRoomHistory, type RoomHistoryEntry } from "../lib/rooms";

function confirmDelete(): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm("Delete this canvas for everyone?"));
  }
  return new Promise((resolve) => {
    Alert.alert("Delete canvas", "Delete this canvas for everyone?", [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

interface RoomHistoryProps {
  userId: string;
  onSelectRoom: (roomId: string) => void;
  onClose: () => void;
}

export function RoomHistory({ userId, onSelectRoom, onClose }: RoomHistoryProps) {
  const [rooms, setRooms] = useState<RoomHistoryEntry[] | null>(null);

  useEffect(() => {
    getRoomHistory(userId).then(({ data }) => setRooms(data));
  }, [userId]);

  async function handleDelete(roomId: string) {
    if (!(await confirmDelete())) return;
    await deleteRoom(roomId);
    setRooms((prev) => prev?.filter((r) => r.id !== roomId) ?? prev);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your canvases</Text>
        <Pressable onPress={onClose} style={styles.iconButton}>
          <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
        </Pressable>
      </View>
      {rooms === null ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : rooms.length === 0 ? (
        <Text style={styles.empty}>No canvases yet — create or join one.</Text>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.roomButton}
                onPress={() => onSelectRoom(item.id)}
              >
                <Text style={styles.roomId}>{item.name}</Text>
                <Text style={styles.roomDate}>
                  Created {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item.id)}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#ef4444"
                />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  roomButton: {
    flex: 1,
  },
  roomId: {
    fontSize: 14,
    fontWeight: "600",
  },
  roomDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
});

import { supabase } from "./supabase";

export async function createRoom(name: string) {
  return supabase.from("rooms").insert({ name }).select().single();
}

export async function roomExists(roomId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .maybeSingle();
  return { exists: !!data, error };
}

// Records that this device has created/joined a room, so a later "your
// previous canvases" screen can look these up by userId.
export async function recordRoomMembership(
  roomId: string,
  userId: string,
  displayName: string,
) {
  return supabase
    .from("room_members")
    .upsert(
      { room_id: roomId, user_id: userId, display_name: displayName },
      { onConflict: "room_id,user_id" },
    );
}

export interface RoomDetails {
  name: string;
  members: string[];
}

export async function getRoomDetails(
  roomId: string,
): Promise<RoomDetails | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("name, room_members(display_name, joined_at)")
    .eq("id", roomId)
    .single();
  if (error || !data) return null;
  const members = (
    data.room_members as { display_name: string | null; joined_at: string }[]
  )
    .filter((m) => m.display_name)
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .map((m) => m.display_name as string);
  return { name: data.name, members };
}

export async function updateRoomName(roomId: string, name: string) {
  return supabase.from("rooms").update({ name }).eq("id", roomId);
}

export interface RoomHistoryEntry {
  id: string;
  name: string;
  createdAt: string;
  joinedAt: string;
}

export async function getRoomHistory(
  userId: string,
): Promise<{ data: RoomHistoryEntry[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("room_members")
    .select("room_id, joined_at, rooms(name, created_at)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error || !data) return { data: [], error };
  return {
    data: data
      .filter((row) => row.rooms)
      .map((row) => ({
        id: row.room_id,
        name:
          (row.rooms as unknown as { name: string; created_at: string }).name ??
          "Untitled Canvas",
        createdAt: (row.rooms as unknown as { name: string; created_at: string })
          .created_at,
        joinedAt: row.joined_at,
      })),
    error: null,
  };
}

export async function deleteRoom(roomId: string) {
  return supabase.from("rooms").delete().eq("id", roomId);
}

import { supabase } from "./supabase";

export async function createRoom() {
  return supabase.from("rooms").insert({}).select().single();
}

export async function roomExists(roomId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .maybeSingle();
  return { exists: !!data, error };
}

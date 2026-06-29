/** @format */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Point, Stroke } from "../lib/types";

interface UseRoomOptions {
  onRemoteDrawing?: (
    userId: string,
    points: Point[],
    color: string,
    width: number,
  ) => void;
  onRemoteDrawingEnd?: (userId: string) => void;
  onStrokeCommitted?: (userId: string) => void;
}

export function useRoom(
  roomId: string,
  userId: string,
  options: UseRoomOptions = {},
) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("strokes")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (isMounted && data) setStrokes(data as Stroke[]);
      });

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "strokes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const stroke = payload.new as Stroke;
          setStrokes((prev) =>
            prev.some((s) => s.id === stroke.id) ? prev : [...prev, stroke],
          );
          if (stroke.user_id !== userId) {
            options.onStrokeCommitted?.(stroke.user_id);
          }
        },
      )
      .on("broadcast", { event: "drawing" }, ({ payload }) => {
        if (payload.userId !== userId) {
          options.onRemoteDrawing?.(
            payload.userId,
            payload.points,
            payload.color,
            payload.width,
          );
        }
      })
      .on("broadcast", { event: "drawing-end" }, ({ payload }) => {
        if (payload.userId !== userId) {
          options.onRemoteDrawingEnd?.(payload.userId);
        }
      })
      .on("broadcast", { event: "clear" }, () => {
        setStrokes([]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const addStroke = useCallback(
    async (points: Point[], color: string, width: number) => {
      const { data, error } = await supabase
        .from("strokes")
        .insert({ room_id: roomId, user_id: userId, points, color, width })
        .select()
        .single();
      if (!error && data) {
        setStrokes((prev) =>
          prev.some((s) => s.id === data.id) ? prev : [...prev, data as Stroke],
        );
      }
      return { data, error };
    },
    [roomId, userId],
  );

  const broadcastDrawing = useCallback(
    (points: Point[], color: string, width: number) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "drawing",
        payload: { userId, points, color, width },
      });
    },
    [userId],
  );

  const broadcastDrawingEnd = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "drawing-end",
      payload: { userId },
    });
  }, [userId]);

  const clearStrokes = useCallback(async () => {
    const { error } = await supabase.from("strokes").delete().eq("room_id", roomId);
    if (!error) {
      setStrokes([]);
      channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} });
    }
    return { error };
  }, [roomId]);

  return { strokes, addStroke, broadcastDrawing, broadcastDrawingEnd, clearStrokes };
}

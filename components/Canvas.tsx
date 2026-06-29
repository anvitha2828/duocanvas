import React, { useRef, useState } from "react";
import { Alert, GestureResponderEvent, PanResponder, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRoom } from "../hooks/useRoom";
import type { Point } from "../lib/types";
import { COLORS, THICKNESSES, Toolbar, type Tool } from "./Toolbar";

const BROADCAST_INTERVAL_MS = 40;
const DRAWING_END_FALLBACK_MS = 4000;
const CANVAS_BACKGROUND = "#fafafa";

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M${first.x} ${first.y} ` + rest.map((p) => `L${p.x} ${p.y}`).join(" ");
}

function confirmClear(): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm("Clear the canvas for everyone?"));
  }
  return new Promise((resolve) => {
    Alert.alert("Clear canvas", "Clear the canvas for everyone?", [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Clear", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

interface CanvasProps {
  roomId: string;
  userId: string;
}

export function Canvas({ roomId, userId }: CanvasProps) {
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(THICKNESSES[1]);
  const [tool, setTool] = useState<Tool>("pen");
  const [remoteDrawings, setRemoteDrawings] = useState<
    Record<string, { points: Point[]; color: string; width: number }>
  >({});
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const fallbackTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearRemoteDrawing = (remoteUserId: string) => {
    clearTimeout(fallbackTimersRef.current[remoteUserId]);
    delete fallbackTimersRef.current[remoteUserId];
    setRemoteDrawings((prev) => {
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
  };

  const { strokes, addStroke, broadcastDrawing, broadcastDrawingEnd, clearStrokes } = useRoom(
    roomId,
    userId,
    {
      onRemoteDrawing: (remoteUserId, points, drawColor, drawWidth) => {
        clearTimeout(fallbackTimersRef.current[remoteUserId]);
        setRemoteDrawings((prev) => ({
          ...prev,
          [remoteUserId]: { points, color: drawColor, width: drawWidth },
        }));
      },
      onRemoteDrawingEnd: (remoteUserId) => {
        // The permanent stroke (from onStrokeCommitted) usually arrives right
        // after this; only fall back to clearing here if it never shows up
        // (e.g. the insert failed), so the line doesn't blink off and back on.
        fallbackTimersRef.current[remoteUserId] = setTimeout(
          () => clearRemoteDrawing(remoteUserId),
          DRAWING_END_FALLBACK_MS
        );
      },
      onStrokeCommitted: (remoteUserId) => {
        clearRemoteDrawing(remoteUserId);
      },
    }
  );

  const pointsRef = useRef<Point[]>([]);
  const lastBroadcastRef = useRef(0);
  const effectiveColor = tool === "eraser" ? CANVAS_BACKGROUND : color;

  // PanResponder is created once via useRef, so its callbacks close over
  // whatever `color`/`width`/`tool` were on the *first* render and never see
  // later updates. Mirror the live values into refs so the handlers below
  // can read the current pick instead of a stale, frozen one.
  const effectiveColorRef = useRef(effectiveColor);
  effectiveColorRef.current = effectiveColor;
  const widthRef = useRef(width);
  widthRef.current = width;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        pointsRef.current = [{ x: locationX, y: locationY }];
        setCurrentPoints(pointsRef.current);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        pointsRef.current = [...pointsRef.current, { x: locationX, y: locationY }];
        setCurrentPoints(pointsRef.current);

        const now = Date.now();
        if (now - lastBroadcastRef.current > BROADCAST_INTERVAL_MS) {
          lastBroadcastRef.current = now;
          broadcastDrawing(pointsRef.current, effectiveColorRef.current, widthRef.current);
        }
      },
      onPanResponderRelease: () => {
        const finished = pointsRef.current;
        pointsRef.current = [];
        broadcastDrawingEnd();
        if (finished.length > 1) {
          // Keep showing the just-drawn line locally until the save is
          // confirmed and it shows up in `strokes`, so it never disappears.
          addStroke(finished, effectiveColorRef.current, widthRef.current).finally(() => {
            setCurrentPoints([]);
          });
        } else {
          setCurrentPoints([]);
        }
      },
    })
  ).current;

  async function handleClear() {
    if (await confirmClear()) {
      clearStrokes();
    }
  }

  return (
    <View style={styles.canvas} {...panResponder.panHandlers}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {strokes.map((stroke) => (
          <Path
            key={stroke.id}
            d={pointsToPath(stroke.points)}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {Object.entries(remoteDrawings).map(([uid, drawing]) => (
          <Path
            key={uid}
            d={pointsToPath(drawing.points)}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {currentPoints.length > 0 && (
          <Path
            d={pointsToPath(currentPoints)}
            stroke={effectiveColor}
            strokeWidth={width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
      <Toolbar
        color={color}
        onColorChange={setColor}
        width={width}
        onWidthChange={setWidth}
        tool={tool}
        onToolChange={setTool}
        onClear={handleClear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: CANVAS_BACKGROUND,
  },
});

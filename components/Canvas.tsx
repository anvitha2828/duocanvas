/** @format */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Directory, File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import Svg, { Path } from "react-native-svg";
import { useRoom } from "../hooks/useRoom";
import type { Point } from "../lib/types";
import CanvasWidget from "../widgets/CanvasWidget";
import { COLORS, THICKNESSES, Toolbar, type Tool } from "./Toolbar";

const BROADCAST_INTERVAL_MS = 40;
const DRAWING_END_FALLBACK_MS = 4000;
const CANVAS_BACKGROUND = "#fafafa";

// Widget extensions have a very tight memory budget (~30MB), so the
// snapshot we hand them must be small — but capturing at a fixed square
// size warps the drawing. Scale the real screen's aspect ratio down to fit
// within that budget instead of forcing a fixed shape.
const WIDGET_SNAPSHOT_MAX_DIMENSION = 320;
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const widgetSnapshotScale =
  WIDGET_SNAPSHOT_MAX_DIMENSION / Math.max(screenWidth, screenHeight);
const WIDGET_SNAPSHOT_WIDTH = Math.round(screenWidth * widgetSnapshotScale);
const WIDGET_SNAPSHOT_HEIGHT = Math.round(screenHeight * widgetSnapshotScale);

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return (
    `M${first.x} ${first.y} ` + rest.map((p) => `L${p.x} ${p.y}`).join(" ")
  );
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

const WIDGET_IMAGE_NAME = "canvas-snapshot.png";
const WIDGET_HAS_NEW_FLAG_NAME = "has-new.flag";

export function Canvas({ roomId, userId }: CanvasProps) {
  const canvasViewRef = useRef<ViewShotRef>(null);
  const canvasContainerRef = useRef<View>(null);

  // `locationX`/`locationY` are relative to whichever native view the touch
  // actually lands on — when a touch starts over the floating Toolbar (a
  // sibling view stacked on top of the canvas), that's the Toolbar's own
  // coordinate space, not the canvas's, producing wildly wrong points (e.g.
  // a touch in the bottom corner reading as the top corner). `pageX`/`pageY`
  // are always screen-relative, so subtracting the canvas's own on-screen
  // position gives correct coordinates regardless of which view the OS
  // decided was the touch target.
  const canvasOffsetRef = useRef({ x: 0, y: 0 });
  const measureCanvasOffset = () => {
    canvasContainerRef.current?.measureInWindow((x, y) => {
      canvasOffsetRef.current = { x, y };
    });
  };

  // Snapshots the drawing (not the toolbar) into the shared App Group folder
  // and tells the home screen widget to show it. The widget itself is
  // written in plain Swift (ios/ExpoWidgetsTarget/CanvasWidget.swift) — it
  // reads this image file and a marker file directly, bypassing expo-widgets'
  // experimental JS-to-SwiftUI layout pipeline, which proved unreliable.
  // `hasNew` controls that marker file, lighting up a dot meaning "someone
  // else drew something since you last looked."
  async function pushWidgetSnapshot(hasNew: boolean) {
    if (!widgetsDirectory) {
      console.warn(
        "[widget] skipped: widgetsDirectory is null (no App Group configured)",
      );
      return;
    }
    if (!canvasViewRef.current) {
      console.warn("[widget] skipped: canvasViewRef not attached yet");
      return;
    }
    try {
      const uri = await canvasViewRef.current.capture();
      const destination = new File(
        new Directory(widgetsDirectory),
        WIDGET_IMAGE_NAME,
      );
      if (destination.exists) destination.delete();
      new File(uri).copy(destination);

      const flagFile = new File(
        new Directory(widgetsDirectory),
        WIDGET_HAS_NEW_FLAG_NAME,
      );
      if (hasNew) {
        if (!flagFile.exists) flagFile.create();
      } else if (flagFile.exists) {
        flagFile.delete();
      }

      CanvasWidget.reload();
      console.log("[widget] snapshot pushed", { hasNew });
    } catch (e) {
      console.error("[widget] pushWidgetSnapshot failed", e);
    }
  }

  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(THICKNESSES[1]);
  const [tool, setTool] = useState<Tool>("pen");
  const [remoteDrawings, setRemoteDrawings] = useState<
    Record<string, { points: Point[]; color: string; width: number }>
  >({});
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const fallbackTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const clearRemoteDrawing = (remoteUserId: string) => {
    clearTimeout(fallbackTimersRef.current[remoteUserId]);
    delete fallbackTimersRef.current[remoteUserId];
    setRemoteDrawings((prev) => {
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
  };

  const {
    strokes,
    addStroke,
    broadcastDrawing,
    broadcastDrawingEnd,
    clearStrokes,
  } = useRoom(roomId, userId, {
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
        DRAWING_END_FALLBACK_MS,
      );
    },
    onStrokeCommitted: (remoteUserId) => {
      clearRemoteDrawing(remoteUserId);
      pushWidgetSnapshot(true);
    },
  });

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

  // While the thickness slider popup is open, refuse to claim the
  // touch — otherwise dragging the slider (which sits right above the
  // toolbar, close to the canvas) can also start a stroke underneath it.
  const sliderOpenRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !sliderOpenRef.current,
      onMoveShouldSetPanResponder: () => !sliderOpenRef.current,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        const x = pageX - canvasOffsetRef.current.x;
        const y = pageY - canvasOffsetRef.current.y;
        pointsRef.current = [{ x, y }];
        setCurrentPoints(pointsRef.current);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        const x = pageX - canvasOffsetRef.current.x;
        const y = pageY - canvasOffsetRef.current.y;
        pointsRef.current = [...pointsRef.current, { x, y }];
        setCurrentPoints(pointsRef.current);

        const now = Date.now();
        if (now - lastBroadcastRef.current > BROADCAST_INTERVAL_MS) {
          lastBroadcastRef.current = now;
          broadcastDrawing(
            pointsRef.current,
            effectiveColorRef.current,
            widthRef.current,
          );
        }
      },
      onPanResponderRelease: () => {
        const finished = pointsRef.current;
        pointsRef.current = [];
        broadcastDrawingEnd();
        if (finished.length > 1) {
          // Keep showing the just-drawn line locally until the save is
          // confirmed and it shows up in `strokes`, so it never disappears.
          addStroke(finished, effectiveColorRef.current, widthRef.current)
            .then(() => {
              pushWidgetSnapshot(false);
            })
            .finally(() => {
              setCurrentPoints([]);
            });
        } else {
          setCurrentPoints([]);
        }
      },
    }),
  ).current;

  async function handleClear() {
    if (await confirmClear()) {
      await clearStrokes();
      pushWidgetSnapshot(false);
    }
  }

  // Opening the room counts as "viewed" — clear the new-stroke dot, but only
  // once the initial stroke fetch has actually landed (otherwise this would
  // snapshot a blank canvas before the room's drawing has loaded).
  const hasPushedInitialSnapshotRef = useRef(false);
  useEffect(() => {
    if (hasPushedInitialSnapshotRef.current) return;
    hasPushedInitialSnapshotRef.current = true;
    pushWidgetSnapshot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const [barVisible, setBarVisible] = useState(true);

  return (
    <View
      ref={canvasContainerRef}
      style={styles.canvas}
      onLayout={measureCanvasOffset}
      {...panResponder.panHandlers}
    >
      <ViewShot
        ref={canvasViewRef}
        style={StyleSheet.absoluteFill}
        options={{
          format: "png",
          quality: 0.8,
          width: WIDGET_SNAPSHOT_WIDTH,
          height: WIDGET_SNAPSHOT_HEIGHT,
        }}
      >
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
      </ViewShot>
      {barVisible ? (
        <Toolbar
          color={color}
          onColorChange={setColor}
          width={width}
          onWidthChange={setWidth}
          tool={tool}
          onToolChange={setTool}
          onClear={handleClear}
          onHide={() => setBarVisible(false)}
          onSliderOpenChange={(open) => {
            sliderOpenRef.current = open;
          }}
        />
      ) : (
        // Bottom offset chosen so this button's vertical center lines up
        // with the bar's vertical center, so showing/hiding doesn't make
        // the control jump to a different height on screen.
        <Pressable
          style={styles.showBarButton}
          onPress={() => setBarVisible(true)}
        >
          <MaterialCommunityIcons name="chevron-up" size={22} color="#6b7280" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: CANVAS_BACKGROUND,
  },
  showBarButton: {
    position: "absolute",
    bottom: 30,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});

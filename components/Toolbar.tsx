/** @format */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const COLORS = ["#1f2937", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];
export const THICKNESSES = [2, 5, 10];
export const WIDTH_MIN = 2;
export const WIDTH_MAX = 16;
export type Tool = "pen" | "eraser";

const SLIDER_HEIGHT = 140;
const SLIDER_WIDTH = 44;

interface ThicknessSliderProps {
  width: number;
  onWidthChange: (width: number) => void;
  onClose: () => void;
  anchorX: number;
  anchorWidth: number;
}

// A vertical slider anchored directly above the thickness button: max at
// the top, min at the bottom (labeled, rather than shown via shape).
// Dragging is relative to where the touch started (grab-and-pull), not an
// absolute jump to wherever the finger lands, so it feels like pulling a
// real slider handle instead of tapping a level on the track.
function ThicknessSlider({
  width,
  onWidthChange,
  onClose,
  anchorX,
  anchorWidth,
}: ThicknessSliderProps) {
  const startValueRef = useRef(width);

  // The PanResponder below is created once and would otherwise close over
  // the first render's `width` forever — mirror it into a ref so grant()
  // always starts a new drag from the current value.
  const widthRef = useRef(width);
  widthRef.current = width;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = widthRef.current;
      },
      onPanResponderMove: (_evt, gestureState: PanResponderGestureState) => {
        const delta =
          (gestureState.dy / SLIDER_HEIGHT) * (WIDTH_MAX - WIDTH_MIN);
        const next = Math.round(startValueRef.current - delta);
        onWidthChange(Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, next)));
      },
    }),
  ).current;

  const thumbY =
    ((WIDTH_MAX - width) / (WIDTH_MAX - WIDTH_MIN)) * SLIDER_HEIGHT;
  const left = anchorX + anchorWidth / 2 - SLIDER_WIDTH / 2;

  return (
    <View style={[styles.sliderPopup, { left }]}>
      <Pressable style={styles.sliderCloseBackdrop} onPress={onClose} />
      <Text style={styles.sliderLabel}>Max</Text>
      <View style={styles.sliderTrack} {...panResponder.panHandlers}>
        <View style={styles.sliderLine} />
        <View style={[styles.sliderThumb, { top: thumbY - 9 }]} />
      </View>
      <Text style={styles.sliderLabel}>Min</Text>
    </View>
  );
}

interface ToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onClear: () => void;
  onHide: () => void;
  onSliderOpenChange?: (open: boolean) => void;
}

const BAR_PADDING_HORIZONTAL = 8;

export function Toolbar({
  color,
  onColorChange,
  width,
  onWidthChange,
  tool,
  onToolChange,
  onClear,
  onHide,
  onSliderOpenChange,
}: ToolbarProps) {
  const [sliderOpen, setSliderOpen] = useState(false);
  const [thicknessButtonLayout, setThicknessButtonLayout] = useState({
    x: 0,
    width: 0,
  });

  function setSliderOpenAndNotify(open: boolean) {
    setSliderOpen(open);
    onSliderOpenChange?.(open);
  }

  return (
    <View style={styles.bar}>
      {sliderOpen && (
        <ThicknessSlider
          width={width}
          onWidthChange={onWidthChange}
          onClose={() => setSliderOpenAndNotify(false)}
          anchorX={BAR_PADDING_HORIZONTAL + thicknessButtonLayout.x}
          anchorWidth={thicknessButtonLayout.width}
        />
      )}
      <View style={styles.row}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColorChange(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c && tool === "pen" && styles.swatchSelected,
            ]}
          />
        ))}
        <Pressable
          style={styles.thicknessButton}
          onLayout={(e) =>
            setThicknessButtonLayout({
              x: e.nativeEvent.layout.x,
              width: e.nativeEvent.layout.width,
            })
          }
          onPress={() => setSliderOpenAndNotify(!sliderOpen)}
        >
          <View
            style={[styles.thicknessDot, { width: width, height: width }]}
          />
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Pressable
          onPress={() => onToolChange("pen")}
          style={[styles.toolButton, tool === "pen" && styles.toolButtonActive]}
        >
          <MaterialCommunityIcons name="pencil" size={22} color="#1f2937" />
        </Pressable>
        <Pressable
          onPress={() => onToolChange("eraser")}
          style={[
            styles.toolButton,
            tool === "eraser" && styles.toolButtonActive,
          ]}
        >
          <MaterialCommunityIcons name="eraser" size={22} color="#1f2937" />
        </Pressable>
        <Pressable onPress={onClear} style={styles.toolButton}>
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={22}
            color="#ef4444"
          />
        </Pressable>
        <Pressable onPress={onHide} style={styles.toolButton}>
          <MaterialCommunityIcons
            name="chevron-down"
            size={22}
            color="#6b7280"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 24,
    left: 9,
    right: 9,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "#ddd",
    marginLeft: 11,
    marginRight: 5,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: "#000",
  },
  thicknessButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    marginLeft: 2,
  },
  thicknessDot: {
    backgroundColor: "#1f2937",
    borderRadius: 999,
  },
  toolButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  toolButtonActive: {
    backgroundColor: "#e5e7eb",
  },
  sliderPopup: {
    position: "absolute",
    bottom: 56,
    alignItems: "center",
  },
  sliderCloseBackdrop: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
  },
  sliderLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    marginVertical: 2,
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sliderLine: {
    position: "absolute",
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
  },
  sliderThumb: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#1f2937",
    backgroundColor: "rgba(31,41,55,0.15)",
  },
});

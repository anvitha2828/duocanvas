import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const COLORS = ["#1f2937", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];
export const THICKNESSES = [2, 5, 10];
export type Tool = "pen" | "eraser";

interface ToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onClear: () => void;
}

export function Toolbar({
  color,
  onColorChange,
  width,
  onWidthChange,
  tool,
  onToolChange,
  onClear,
}: ToolbarProps) {
  return (
    <View style={styles.bar}>
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
        <View style={styles.divider} />
        {THICKNESSES.map((w) => (
          <Pressable
            key={w}
            onPress={() => onWidthChange(w)}
            style={[styles.widthButton, width === w && styles.widthButtonSelected]}
          >
            <View style={[styles.widthDot, { width: w + 6, height: w + 6 }]} />
          </Pressable>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Pressable
          onPress={() => onToolChange("pen")}
          style={[styles.toolButton, tool === "pen" && styles.toolButtonActive]}
        >
          <Text style={styles.toolText}>Pen</Text>
        </Pressable>
        <Pressable
          onPress={() => onToolChange("eraser")}
          style={[styles.toolButton, tool === "eraser" && styles.toolButtonActive]}
        >
          <Text style={styles.toolText}>Eraser</Text>
        </Pressable>
        <Pressable onPress={onClear} style={styles.toolButton}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 24,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#ddd",
    marginHorizontal: 8,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: "#000",
  },
  widthButton: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  widthButtonSelected: {
    backgroundColor: "#e5e7eb",
  },
  widthDot: {
    backgroundColor: "#333",
    borderRadius: 999,
  },
  toolButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  toolButtonActive: {
    backgroundColor: "#e5e7eb",
  },
  toolText: {
    fontSize: 12,
    fontWeight: "600",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
});

import { Image, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import { containerBackground, foregroundStyle, frame } from "@expo/ui/swift-ui/modifiers";
import { createWidget, widgetsDirectory, type WidgetEnvironment } from "expo-widgets";

export interface CanvasWidgetProps {
  imagePath: string | null;
  hasNew: boolean;
}

// iOS 17+ requires every widget's root view to set a container background,
// or the system shows a "please adopt containerBackground API" placeholder
// instead of any content.
const WIDGET_BACKGROUND = [containerBackground("#fafafa", "widget")];

const CanvasWidget = (props: CanvasWidgetProps, environment: WidgetEnvironment) => {
  "widget";

  return (
    <ZStack modifiers={WIDGET_BACKGROUND}>
      {props.imagePath ? (
        <Image uiImage={`${widgetsDirectory}${props.imagePath}`} modifiers={[frame({ width: 160, height: 160 })]} />
      ) : (
        <Text>Open duo-canvas to start a room</Text>
      )}
      {props.imagePath && props.hasNew && (
        <VStack modifiers={[frame({ width: 14, height: 14 })]}>
          <Text modifiers={[foregroundStyle("#ef4444")]}>●</Text>
        </VStack>
      )}
    </ZStack>
  );
};

export default createWidget("CanvasWidget", CanvasWidget);

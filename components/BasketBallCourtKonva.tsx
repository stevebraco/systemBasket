import { useResponsiveCourt } from "@/hooks/useResponsiveCourt";
import { Group, Rect } from "react-konva";

const BasketBallCourtKonva = ({
  lineColor = "white",
  backgroundCourt = "black",
  stageWidth,
  stageHeight,
  scale,
}) => {
  return (
    <Group x={0} y={0}>
      {/* Fond du terrain */}
      <Rect
        x={0}
        y={0}
        width={stageWidth}
        height={stageHeight}
        fill={backgroundCourt}
        stroke={lineColor}
        strokeWidth={2}
      />
    </Group>
  );
};

export default BasketBallCourtKonva;

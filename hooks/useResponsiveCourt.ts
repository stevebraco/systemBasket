import { useState, useEffect, useRef } from "react";

interface UseResponsiveCourtProps {
  sceneWidth: number;
  sceneHeight: number;
  maxWidth?: number;
}

export function useResponsiveCourt({
  sceneWidth,
  sceneHeight: initialSceneHeight,
  maxWidth = 1200,
}: UseResponsiveCourtProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [sceneHeight, setSceneHeight] = useState(initialSceneHeight);

  const [stageSize, setStageSize] = useState({
    width: sceneWidth,
    height: sceneHeight,
    scale: 1,
  });

  const updateSize = () => {
    if (!containerRef.current) return;

    let newSceneHeight = initialSceneHeight;

    // ✅ Breakpoints
    if (window.innerWidth <= 400) {
      newSceneHeight = 2000;
    } else if (window.innerWidth <= 575) {
      newSceneHeight = 1700;
    } else if (window.innerWidth <= 700) {
      newSceneHeight = 1200;
    }

    setSceneHeight(newSceneHeight);

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const scale = Math.min(
      containerWidth / sceneWidth,
      containerHeight / newSceneHeight
    );

    const width = Math.min(sceneWidth * scale, maxWidth);
    const height = newSceneHeight * scale;

    setStageSize({ width, height, scale });
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return { containerRef, stageSize };
}

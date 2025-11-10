import { useState, useEffect, useRef } from "react";

interface UseResponsiveCourtProps {
  sceneWidth: number;
  sceneHeight: number;
  maxWidth?: number;
}

export function useResponsiveCourt({
  sceneWidth,
  sceneHeight,
  maxWidth = 1200,
}: UseResponsiveCourtProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [stageSize, setStageSize] = useState({
    width: sceneWidth,
    height: sceneHeight,
    scale: 1,
  });

  const updateSize = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // ✅ Calcule un scale qui garde le ratio de la scène
    const scale = Math.min(
      containerWidth / sceneWidth,
      containerHeight / sceneHeight
    );

    // ✅ Ajuste la taille du stage pour qu’il rentre dans le conteneur
    const width = Math.min(sceneWidth * scale, maxWidth);
    const height = sceneHeight * scale;

    setStageSize({ width, height, scale });
  };

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return { containerRef, stageSize };
}

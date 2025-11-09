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
    const windowWidth = window.innerWidth;

    // ✅ Mode mobile: hauteur = 100vh
    if (windowWidth <= 600) {
      const height = window.innerHeight;

      const scale = Math.min(containerWidth / sceneWidth, height / sceneHeight);

      setStageSize({
        width: containerWidth,
        height,
        scale,
      });
      return;
    }

    // ✅ Mode desktop: comportement initial
    const containerHeight = container.offsetHeight;

    const scale = Math.min(
      containerWidth / sceneWidth,
      containerHeight / sceneHeight
    );

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

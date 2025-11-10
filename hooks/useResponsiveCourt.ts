import { useState, useLayoutEffect, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // corrige l'initialisation : on utilise bien initialSceneHeight
  const [sceneHeight, setSceneHeight] = useState<number>(initialSceneHeight);

  const [stageSize, setStageSize] = useState({
    width: sceneWidth,
    height: initialSceneHeight,
    scale: 1,
  });

  const computeNewSceneHeight = (innerWidth: number) => {
    if (innerWidth <= 400) return 1500;
    if (innerWidth <= 430) return 1700;
    if (innerWidth <= 700) return 1200;
    return initialSceneHeight;
  };

  const measureAndUpdate = () => {
    const container = containerRef.current;
    if (!container) return;

    // use getBoundingClientRect pour plus de précision
    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    // si conteneur non dimensionné, on attend
    if (containerWidth === 0 || containerHeight === 0) return;

    const newSceneHeight = computeNewSceneHeight(window.innerWidth);
    setSceneHeight(newSceneHeight);

    const scale = Math.min(
      containerWidth / sceneWidth,
      containerHeight / newSceneHeight
    );

    const width = Math.min(sceneWidth * scale, maxWidth);
    const height = newSceneHeight * scale;

    setStageSize({ width, height, scale });
  };

  useLayoutEffect(() => {
    // Mesure initiale garantie après rendu : RAF aide si le DOM est encore "en train" de se stabiliser
    const initialRaf = requestAnimationFrame(() => {
      measureAndUpdate();
    });

    // ResizeObserver si disponible — le plus fiable pour changements de taille du conteneur
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        // requestAnimationFrame pour éviter trop de calculs synchrones
        requestAnimationFrame(measureAndUpdate);
      });
      if (containerRef.current) ro.observe(containerRef.current);
    } else {
      // fallback : écoute window resize
      window.addEventListener("resize", measureAndUpdate);
    }

    // aussi écouter resize window (utile si breakpoint dépend de window.innerWidth)
    window.addEventListener("resize", measureAndUpdate);

    return () => {
      cancelAnimationFrame(initialRaf);
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measureAndUpdate);
      // remove duplicate if we added it twice in fallback branch (safe)
      try {
        window.removeEventListener("resize", measureAndUpdate);
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneWidth, initialSceneHeight, maxWidth]);

  return { containerRef, stageSize, sceneHeight };
}

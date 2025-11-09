import { useMemo } from "react";

export function useAnimatedPath(
  path: { x: number; y: number }[],
  progress: number
) {
  return useMemo(() => {
    if (!path || path.length < 2) return [];

    const totalPoints = path.length;
    const visiblePointsCount = Math.ceil(progress * totalPoints);

    // On prend toujours au moins deux points pour que Konva Arrow fonctionne
    return path.slice(0, Math.max(2, visiblePointsCount));
  }, [path, progress]);
}

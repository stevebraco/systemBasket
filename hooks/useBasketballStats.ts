import { useMemo, useRef } from "react";
import type { Zone, Action } from "./types"; // si tu veux séparer les types

export function useBasketballStats(
  zonesData: Zone[],
  actions: Action[],
  selectedPlayer?: { name: string }
) {
  const refs = useRef<{ [key: string]: any }>({});

  // --- Filter actions by player ---
  const filteredActions = useMemo(
    () =>
      selectedPlayer?.name
        ? actions.filter((a) => a.player === selectedPlayer.name)
        : actions,
    [actions, selectedPlayer]
  );

  // --- Helper: check if a point is in a zone ---
  const containsPoint = (zone: Zone, px: number, py: number, ref: any) => {
    if (!ref) return false;
    const transform = ref.getTransform().copy().invert();
    const local = transform.point({ x: px, y: py });
    const s = zone.shapeProps;

    if (zone.type === "rect") {
      return (
        local.x >= 0 &&
        local.x <= s.width &&
        local.y >= 0 &&
        local.y <= s.height
      );
    }
    if (zone.type === "concave" || zone.type === "arc") {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      drawZone(ctx, zone);
      return ctx.isPointInPath(local.x, local.y);
    }
    return false;
  };

  // --- Draw a zone in Canvas 2D context ---
  const drawZone = (ctx: CanvasRenderingContext2D, zone: Zone) => {
    const s = zone.shapeProps;
    ctx.beginPath();

    if (zone.type === "rect") {
      const [tl, tr, br, bl] = s.cornerRadius || [0, 0, 0, 0];
      ctx.moveTo(0 + tl, 0);
      ctx.lineTo(s.width - tr, 0);
      ctx.quadraticCurveTo(s.width, 0, s.width, tr);
      ctx.lineTo(s.width, s.height - br);
      ctx.quadraticCurveTo(s.width, s.height, s.width - br, s.height);
      ctx.lineTo(bl, s.height);
      ctx.quadraticCurveTo(0, s.height, 0, s.height - bl);
      ctx.lineTo(0, tl);
      ctx.quadraticCurveTo(0, 0, tl, 0);
    }

    if (zone.type === "concave") {
      ctx.moveTo(s.rectX, s.rectY + s.rectH);
      ctx.lineTo(s.rectX, s.rectY);
      ctx.lineTo(s.rectX + s.rectW, s.rectY);
      ctx.arc(s.centerX, s.centerY, s.radius, s.arcStart, s.arcEnd, true);
      ctx.lineTo(s.rectX + s.rectW, s.rectY + s.rectH);
      ctx.lineTo(s.rectX, s.rectY + s.rectH);
    }

    if (zone.type === "arc") {
      const steps = 50;
      for (let i = 0; i <= steps; i++) {
        const angle = (s.rotation + (s.angle * i) / steps) * (Math.PI / 180);
        const x = s.x + s.outerRadius * Math.cos(angle);
        const y = s.y + s.outerRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = 0; i <= steps; i++) {
        const angle =
          (s.rotation + (s.angle * (steps - i)) / steps) * (Math.PI / 180);
        const x = s.x + s.innerRadius * Math.cos(angle);
        const y = s.y + s.innerRadius * Math.sin(angle);
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
  };

  // --- Calculate stats per zone ---
  const stats = useMemo(() => {
    const shots = filteredActions.filter((a) => a.typeItem === "shot");

    return zonesData.map((zone) => {
      const attempts = shots.filter((s) =>
        containsPoint(zone, s.x, s.y, refs.current[zone.id])
      ).length;
      const makes = shots.filter(
        (s) => s.made && containsPoint(zone, s.x, s.y, refs.current[zone.id])
      ).length;
      return {
        ...zone,
        attempts,
        makes,
        percentage: attempts > 0 ? Math.round((makes / attempts) * 100) : 0,
      };
    });
  }, [filteredActions, zonesData]);

  // --- Get color from percentage ---
  const getColorFromPercentage = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const base = { r: 100, g: 149, b: 237 };
    const t = clamped / 100;
    const r = Math.round(255 + (base.r - 255) * t);
    const g = Math.round(255 + (base.g - 255) * t);
    const b = Math.round(255 + (base.b - 255) * t);
    const alpha = 0.1 + t * (0.5 - 0.1);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return { refs, stats, drawZone, getColorFromPercentage, containsPoint };
}

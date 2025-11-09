import { useState, useMemo } from "react";
import { HHMMSSToSeconds, secondsToHHMMSS } from "@/utils/timeUtils";
import {
  Shot,
  ActionItem,
  PlayerStatsUpdate,
  CustomEventType,
  MatchEventType,
} from "@/types/types";

type PendingEvent = { x: number; y: number; zone: string } | null;

export function useBasketballCourt({
  initialShots,
  selectedPlayer,
  passer,
  setPasser,
  onUpdateStats,
  isThreePointShot,
  getCurrentTime,
}: {
  initialShots: Shot[];
  selectedPlayer?: string;
  onUpdateStats: (
    update: PlayerStatsUpdate,
    shotOrEvent: Shot | CustomEventType
  ) => void;
  isThreePointShot: (x: number, y: number) => boolean;
  getCurrentTime: any;
  passer: string;
  setPasser: any;
}) {
  const [actions, setActions] = useState<ActionItem[]>(initialShots);
  const [pendingEvent, setPendingEvent] = useState<PendingEvent>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<string | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [eventType, setEventType] = useState("tir");
  const [reboundType, setReboundType] = useState<"off" | "def">("def");

  const allPoints = useMemo(
    () => [...actions].sort((a, b) => a.timestamp - b.timestamp),
    [actions]
  );

  const handleCourtClick = (
    x: number,
    y: number,
    currentTime: number,
    scale: number,
    zone: string
  ) => {
    if (pendingEvent || !selectedPlayer.name) return;
    const realX = x / scale;
    const realY = y / scale;
    // setPendingEvent({ x, y });
    setPendingEvent({ x: realX, y: realY, zone });
    setPendingTimestamp(secondsToHHMMSS(Math.floor(currentTime)));
    setCommentaire("");
    setEventType("tir");
  };

  const confirmEvent = (made?: boolean) => {
    if (!pendingEvent || !selectedPlayer.name) return;

    // Récupération directe du temps de la vidéo
    const videoSeconds = getCurrentTime?.() ?? 0;

    if (eventType === "tir" && typeof made === "boolean") {
      const type: Shot["type"] = isThreePointShot(
        pendingEvent.x,
        pendingEvent.y
      )
        ? "3PT"
        : "2PT";

      const points = made ? (type === "3PT" ? 3 : 2) : 0;

      const newShot: MatchEventType = {
        ...pendingEvent,
        type,
        playerId: selectedPlayer.id,
        player: selectedPlayer.name,
        timestamp: videoSeconds, // ✅ On utilise le temps vidéo
        made,
        commentaire,
        passer: passer === "none" ? null : passer,
        typeItem: "shot",
      };

      const update: PlayerStatsUpdate = {
        playerId: selectedPlayer.id,
        name: selectedPlayer.name,
        points,
        points2PT: made && type === "2PT" ? 2 : 0,
        points3PT: made && type === "3PT" ? 3 : 0,
        shotsMade: made ? 1 : 0,
        shotsAttempted: 1,
        passer: passer === "none" ? null : passer,
      };

      onUpdateStats(update, newShot);
      setActions((prev) => [...prev, newShot]);
    } else {
      const newEvent: CustomEventType = {
        ...pendingEvent,
        timestamp: videoSeconds, // ✅ On utilise le temps vidéo
        commentaire,
        eventType: eventType === "rebond" ? `rebond_${reboundType}` : eventType,
        player: selectedPlayer.name,
        playerId: selectedPlayer.id,
        typeItem: "event",
      };

      const update: PlayerStatsUpdate = {
        id: selectedPlayer.id,
        name: selectedPlayer.name,
      };

      if (eventType === "interception") {
        update.steals = 1;
      } else if (eventType === "perte_de_balle") {
        update.turnovers = 1;
      } else if (eventType === "contre") {
        update.blocks = 1;
      } else if (eventType === "rebond_off") {
        update.reboundsOff = 1;
      } else if (eventType === "rebond_off") {
        update.reboundsDef = 1;
      } else if (eventType === "assist") {
        update.assists = 1;
      } else if (eventType === "faute") {
        update.fautes = 1;
      } else if (eventType.startsWith("LF")) {
        // On récupère réussites / tentatives depuis la valeur "LFx/y"
        const [made, attempts] = eventType
          .replace("LF", "")
          .split("/")
          .map(Number);
        update.ftm = made;
        update.fta = attempts;
        update.points = made; // 1 point par lancer franc réussi
      }
      onUpdateStats(update, newEvent);
      setActions((prev) => [...prev, newEvent]);
    }

    resetPending();
  };

  const resetPending = () => {
    setPendingEvent(null);
    setPendingTimestamp(null);
    setCommentaire("");
    setPasser(null);
  };

  return {
    actions,
    allPoints,
    pendingEvent,
    pendingTimestamp,
    commentaire,
    eventType,
    reboundType,
    setCommentaire,
    setEventType,
    setReboundType,
    setPendingTimestamp,
    handleCourtClick,
    confirmEvent,
    resetPending,
  };
}

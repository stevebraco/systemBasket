import { useState, useRef } from "react";

export function useYoutubePlayer() {
  const [player, setPlayer] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null); // Sert si tu veux scroller vers la vidéo

  const handleReady = (event: any) => {
    console.log("event.target", event.target);
    setPlayer(event.target); // event.target est l'instance du player
  };

  const seekTo = (timestamp: number) => {
    if (player) {
      console.log("timestamp", timestamp);
      player.seekTo(timestamp, true);
      setCurrentTime(timestamp);
      playerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const reset = () => {
    setCurrentTime(null);
  };

  const getCurrentTime = () => {
    if (player) {
      return player.getCurrentTime(); // ✅ Appel sur l'instance YouTube player
    }
    return 0;
  };

  return {
    player,
    currentTime,
    playerRef,
    handleReady,
    seekTo,
    reset,
    getCurrentTime,
  };
}

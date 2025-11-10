"use client";

import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Circle,
  Text,
  Line,
  Arrow,
  Image as KonvaImage,
  Group,
  Rect,
} from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { useResponsiveCourt } from "@/hooks/useResponsiveCourt";
import { useTacticsBoard } from "@/hooks/useTacticsBoard";
import useImage from "@/hooks/useImage";
import { Separator } from "./ui/separator";
import { CommentKonva } from "./CommentKonva";
import TShape from "./ui/TShape";

export default function TacticBoard() {
  const image = useImage("/ball.png");
  const courtImage = useImage("/halfcourt.png");

  const stageRef = useRef<Konva.Stage | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const [animatedArrowProgress, setAnimatedArrowProgress] = useState<{
    [playerId: string]: number;
  }>({});

  const [showBlackPlayers, setShowBlackPlayers] = useState(true);
  const [showGreyPlayers, setShowGreyPlayers] = useState(true);

  const { containerRef, stageSize } = useResponsiveCourt({
    sceneWidth: 800,
    sceneHeight: 800,
    maxWidth: 1010,
  });

  function createWavyArrow(
    start: { x: number; y: number },
    end: { x: number; y: number },
    amplitude = 8,
    wavelength = 20
  ) {
    const points: { x: number; y: number }[] = [];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const steps = Math.floor(length / 2); // plus de steps = plus lisse

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * length;
      const y = Math.sin((x / wavelength) * 2 * Math.PI) * amplitude;
      // rotation pour aligner avec la direction
      const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
      const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
      points.push({ x: start.x + rotatedX, y: start.y + rotatedY });
    }

    return points;
  }

  const {
    players,
    ball,
    drawings,
    newShapePoints,
    drawMode,
    drawing,
    replaySpeed,
    currentComment,
    isRecording,
    isReplaying,
    isPaused,
    setDrawMode,
    setDrawing,
    setNewShapePoints,
    setReplaySpeed,
    getPlayerColor,
    handleDragMove,
    handleBallDrag,
    addStep,
    handleReplay,
    currentSystem,
    togglePause,
    playPresetSystem,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDragStart,
    handleCommentChange,
    playerRadius,
    ballRadius,
    stepProgress,
    goToStep,
    replayIndex,
    setCurrentComment,
    setDrawings,
    selectedId,
    setSelectedId,
    previewArrows,
    playerWithBall,
    removeDrawing,
    updateCommentText,
    handleCommentDragMove,
    showArrows,
    setShowArrows,
  } = useTacticsBoard();

  const startRecording = () => {
    if (!stageRef.current) return;

    const stage = stageRef.current.getStage();
    const canvas = stage.content.children[0] as HTMLCanvasElement;

    if (!canvas.captureStream) {
      console.error("captureStream n'est pas disponible");
      return;
    }

    const stream = canvas.captureStream(60);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/mp4" });
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setVideoURL(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = "tactic-video.mp4";
      a.click();
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setRecording(true);

    if (currentSystem && currentSystem.recording.length) {
      handleReplay();
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  function getPointAtProgress(path: { x: number; y: number }[], t: number) {
    // t entre 0 et 1
    const totalLen = path.reduce(
      (len, p, i) => (i > 0 ? len + distance(path[i - 1], p) : 0),
      0
    );
    let target = t * totalLen;
    for (let i = 1; i < path.length; i++) {
      const segLen = distance(path[i - 1], path[i]);
      if (target <= segLen) {
        const ratio = target / segLen;
        return {
          x: path[i - 1].x + ratio * (path[i].x - path[i - 1].x),
          y: path[i - 1].y + ratio * (path[i].y - path[i - 1].y),
        };
      }
      target -= segLen;
    }
    return path[path.length - 1];
  }

  function distance(
    a: { x: number; y: number } | undefined,
    b: { x: number; y: number } | undefined
  ) {
    if (!a || !b) return 0;
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  // 🔄 Hook replay pour chaque étape

  const getArrowHeadSize = (points: number[]) => {
    const dx = points[points.length - 2] - points[points.length - 4] || 1;
    const dy = points[points.length - 1] - points[points.length - 3] || 1;
    const length = Math.sqrt(dx * dx + dy * dy);
    return Math.min(10, length / 2); // jamais plus grand que la moitié de la flèche
  };
  const getArrowPointsFromPath = (path: { x: number; y: number }[]) => {
    if (!path || path.length < 2) return [];
    const points: number[] = [];
    for (let i = 0; i < path.length; i++) {
      points.push(path[i].x, path[i].y);
    }
    return points;
  };

  function createZigZagPath(
    path: { x: number; y: number }[],
    amplitude = 10,
    frequency = 0.2
  ) {
    return path.map((p, i) => {
      const offsetX = Math.sin(i * frequency) * amplitude;
      const offsetY = Math.cos(i * frequency) * amplitude;
      return { x: p.x + offsetX, y: p.y + offsetY };
    });
  }

  return (
    <>
      <Card className="col-span-2">
        <div className="flex flex-col gap-4 w-full mx-auto p-3">
          {/* 🎯 Vitesse de lecture */}
          <div>
            <h2 className="text-base font-semibold mb-1 text-center">
              ⏱ Vitesse de lecture
            </h2>
            <Input
              type="range"
              min={400}
              max={2000}
              step={100}
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 text-center text-xs text-gray-300">
              Étape {stepProgress}
            </div>
          </div>

          <Separator />

          {/* 🎬 Enregistrement & Lecture */}
          <div>
            <h2 className="text-base font-semibold mb-1 text-center">
              🎬 Enregistrement
            </h2>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={startRecording}
                disabled={recording}
                className="w-full"
              >
                ⏺️ Démarrer
              </Button>
              <Button
                size="sm"
                onClick={stopRecording}
                disabled={!recording}
                className="w-full"
              >
                ⏹️ Arrêter
              </Button>
              <Button
                size="sm"
                onClick={addStep}
                disabled={isRecording || isReplaying}
                className="w-full"
              >
                ➕ Ajouter étape
              </Button>
              <Button
                size="sm"
                onClick={handleReplay}
                disabled={!currentSystem || !currentSystem.recording.length}
                className="w-full"
              >
                🔁 Lire
              </Button>
              <div className="flex justify-between">
                <Button
                  size="sm"
                  onClick={() => goToStep(replayIndex - 1)}
                  // disabled={replayIndex <= 0}
                  className="w-[49%]"
                >
                  ◀️ Préc.
                </Button>
                <Button
                  size="sm"
                  onClick={() => goToStep(replayIndex + 1)}
                  // disabled={replayIndex >= 0}
                  className="w-[49%]"
                >
                  ▶️ Suiv.
                </Button>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-base font-semibold mb-1 text-center">
              🎨 Joueurs
            </h2>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => setShowArrows((prev) => !prev)}
                className="w-full"
              >
                {showArrows ? "🧭 Masquer flèches" : "🧭 Afficher flèches"}
              </Button>

              <Button
                size="sm"
                variant={showBlackPlayers ? "secondary" : "default"}
                onClick={() => setShowBlackPlayers(!showBlackPlayers)}
                className="w-full"
              >
                {showBlackPlayers
                  ? "Masquer joueurs noirs"
                  : "Afficher joueurs noirs"}
              </Button>
              <Button
                size="sm"
                variant={showGreyPlayers ? "secondary" : "default"}
                onClick={() => setShowGreyPlayers(!showGreyPlayers)}
                className="w-full"
              >
                {showGreyPlayers
                  ? "Masquer joueurs gris"
                  : "Afficher joueurs gris"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* ✏️ Dessin */}
          <div>
            <h2 className="text-base font-semibold mb-1 text-center">
              ✏️ Outils
            </h2>
            <div className="flex flex-wrap gap-1 justify-center">
              {["arrow", "screen", "T", "comment", "line", "erase"].map(
                (mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={drawMode === mode ? "secondary" : "default"}
                    onClick={() => setDrawMode(mode)}
                    className="w-[45%]"
                  >
                    {mode === "arrow" && "🏹"}
                    {mode === "screen" && "🟦"}
                    {mode === "T" && "🟨"}
                    {mode === "comment" && "💬"}
                    {mode === "line" && "➖"}
                    {mode === "erase" && "🗑️"}
                  </Button>
                )
              )}
            </div>
          </div>

          <Separator />
        </div>
      </Card>
      <Card className="col-span-10 h-full">
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            background: "purple",
          }}
        >
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={stageSize.scale}
            scaleY={stageSize.scale}
            style={{
              position: "relative",
              zIndex: 1,
              background: "red",
              cursor: drawing ? "crosshair" : "default",
              width: "100%",
              height: "100%",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={(e) => handleMouseDown(e)}
            onTouchMove={(e) => handleMouseMove(e)}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              {courtImage && (
                <KonvaImage
                  image={courtImage}
                  x={0}
                  y={0}
                  width={stageSize.width / stageSize.scale}
                  height={stageSize.height / stageSize.scale}
                />
              )}
              {/* <BasketBallCourtKonva /> */}

              {players.map((pos, i) => {
                const color = getPlayerColor(i);

                if (
                  (color === "#212121" && !showBlackPlayers) ||
                  (color === "grey" && !showGreyPlayers)
                ) {
                  return null; // joueur masqué
                }

                return (
                  <Circle
                    key={`circle-${i}`}
                    x={pos.x}
                    y={pos.y}
                    radius={playerRadius}
                    fill={color}
                    draggable={!isReplaying}
                    onDragMove={(e) => handleDragMove(i, e)}
                    onDragStart={() => handleDragStart(i)}
                    shadowColor={color}
                    shadowBlur={10}
                    shadowOffsetX={0}
                    shadowOffsetY={0}
                    shadowOpacity={0.7}
                  />
                );
              })}

              {players.map((pos, i) => {
                const color = getPlayerColor(i);

                if (
                  (color === "#212121" && !showBlackPlayers) ||
                  (color === "grey" && !showGreyPlayers)
                ) {
                  return null; // texte masqué
                }

                return (
                  <Text
                    key={`text-${i}`}
                    x={pos.x - 5}
                    y={pos.y - 7}
                    text={i < 5 ? `${i + 1}` : `${i - 4}`} // i = 0..9
                    fontSize={15}
                    fill="white"
                    listening={false}
                  />
                );
              })}

              {image && (
                <KonvaImage
                  image={image}
                  x={ball.x}
                  y={ball.y}
                  draggable={!isReplaying}
                  onDragMove={handleBallDrag}
                  width={ballRadius}
                  height={ballRadius}
                />
              )}

              {/* {Object.entries(previewArrows).map(([key, path]) => {
                if (!path || path.length < 2) return null;

                let arrowPoints: { x: number; y: number }[] = path;

                // Joueur avec la balle → zig-zag wavy
                if (playerWithBall === parseInt(key)) {
                  arrowPoints = createWavyArrow(
                    path[0],
                    path[path.length - 1],
                    8,
                    20
                  );
                }

                return (
                  <Arrow
                    key={`preview-${key}`}
                    points={arrowPoints.flatMap((p) => [p.x, p.y])}
                    pointerLength={10}
                    pointerWidth={6}
                    stroke={key === "ball" ? "orange" : "black"}
                    fill={key === "ball" ? "orange" : "black"}
                    strokeWidth={3}
                    lineCap="round"
                    lineJoin="round"
                    dash={key === "ball" ? [15, 10] : []}
                  />
                );
              })} */}

              {showArrows &&
                Object.entries(previewArrows).map(([key, path]) => {
                  if (!path || path.length < 2) return null;

                  // 👉 ne filtre que si ce n’est PAS la balle
                  if (key !== "ball") {
                    const playerIndex = parseInt(key);
                    const color = getPlayerColor(playerIndex);

                    if (
                      (color === "#212121" && !showBlackPlayers) ||
                      (color === "grey" && !showGreyPlayers)
                    ) {
                      return null; // flèche du joueur masquée
                    }
                  }

                  // Lissage
                  const smoothPath = (
                    pts: { x: number; y: number }[],
                    windowSize = 5
                  ) => {
                    if (pts.length <= windowSize) return pts;
                    return pts.map((p, i, arr) => {
                      const slice = arr.slice(
                        Math.max(0, i - windowSize),
                        Math.min(arr.length, i + windowSize)
                      );
                      const avgX =
                        slice.reduce((a, b) => a + b.x, 0) / slice.length;
                      const avgY =
                        slice.reduce((a, b) => a + b.y, 0) / slice.length;
                      return { x: avgX, y: avgY };
                    });
                  };

                  const smooth = smoothPath(path);

                  // Portion déjà parcourue / restante
                  let traveledPoints: number[] = [];
                  let remainingPoints: number[] = [];

                  if (key === "ball") {
                    remainingPoints = smooth.flatMap((p) => [p.x, p.y]);
                  } else {
                    const playerIndex = parseInt(key);
                    const playerPos = players[playerIndex];
                    let traveledIndex = 0;

                    for (let i = 1; i < smooth.length; i++) {
                      if (
                        distance(smooth[i], playerPos) <
                        distance(smooth[i - 1], playerPos)
                      ) {
                        traveledIndex = i;
                      } else break;
                    }

                    traveledPoints = smooth
                      .slice(0, traveledIndex + 1)
                      .flatMap((p) => [p.x, p.y]);
                    remainingPoints = smooth
                      .slice(traveledIndex)
                      .flatMap((p) => [p.x, p.y]);
                  }

                  return (
                    <Group key={`preview-${key}`}>
                      {traveledPoints.length >= 4 && key !== "ball" && (
                        <Line
                          points={traveledPoints}
                          stroke="black"
                          strokeWidth={5}
                          opacity={0.2}
                          tension={0.5}
                          lineCap="round"
                          lineJoin="round"
                        />
                      )}
                      {remainingPoints.length >= 4 && (
                        <Arrow
                          points={remainingPoints}
                          pointerLength={10}
                          pointerWidth={5}
                          stroke={key === "ball" ? "orange" : "black"}
                          fill={key === "ball" ? "orange" : "black"}
                          strokeWidth={5}
                          tension={0.5}
                          lineCap="round"
                          lineJoin="round"
                          dash={key === "ball" ? [15, 10] : []} // pointillé si balle
                        />
                      )}
                    </Group>
                  );
                })}

              {drawings
                .filter((shape) => shape.type === "comment")
                .map((shape) => (
                  <CommentKonva
                    key={shape.id}
                    comment={shape}
                    updateText={updateCommentText}
                    removeComment={removeDrawing}
                    isRecordingOrReplay={isRecording || isReplaying} // <-- important
                    handleCommentDragMove={handleCommentDragMove}
                  />
                ))}

              {/* Dessins existants */}
              {drawings.map((shape) => {
                // si points est requis mais absent, on ignore le shape
                if (
                  (shape.type === "arrow" ||
                    shape.type === "screen" ||
                    shape.type === "line") &&
                  !shape.points
                ) {
                  return null;
                }

                switch (shape.type) {
                  case "arrow":
                    return (
                      <Arrow
                        key={shape.id}
                        points={shape.points!} // "!" dit à TS que points n'est pas undefined
                        pointerLength={getArrowHeadSize(shape.points!)}
                        pointerWidth={getArrowHeadSize(shape.points!) / 2}
                        fill="white"
                        stroke="white"
                        strokeWidth={5}
                      />
                    );
                  case "screen":
                    return (
                      <Line
                        key={shape.id}
                        points={shape.points!}
                        stroke={shape.stroke || "blue"}
                        strokeWidth={shape.strokeWidth || 3}
                        dash={shape.dash || [10, 5]}
                        tension={shape.tension ?? 0.5}
                      />
                    );
                  case "line":
                    return (
                      <Line
                        key={shape.id}
                        points={shape.points!}
                        stroke={shape.stroke || "green"}
                        strokeWidth={shape.strokeWidth || 2}
                      />
                    );
                  case "T":
                    return (
                      <TShape
                        key={shape.id}
                        shapeProps={{
                          ...shape,
                          x: shape.x ?? 0,
                          y: shape.y ?? 0,
                          rotation: shape.rotation ?? 0,
                        }}
                        isSelected={shape.id === selectedId}
                        onSelect={() => setSelectedId(shape.id)}
                        onChange={(newAttrs) => {
                          setDrawings((prev) =>
                            prev.map((s) => (s.id === shape.id ? newAttrs : s))
                          );
                        }}
                      />
                    );
                  default:
                    return null;
                }
              })}

              {/* Dessin en cours */}
              {drawing && drawMode === "arrow" && (
                <Arrow
                  points={newShapePoints}
                  pointerLength={10}
                  pointerWidth={10}
                  fill="white"
                  stroke="white"
                  strokeWidth={3}
                />
              )}
              {drawing && drawMode === "screen" && (
                <Line
                  points={newShapePoints}
                  stroke="blue"
                  strokeWidth={3}
                  dash={[10, 5]}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
              {drawing && drawMode === "line" && (
                <Line
                  points={newShapePoints}
                  stroke="green"
                  strokeWidth={2}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </Layer>
          </Stage>
        </div>
      </Card>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";

type Vec2 = { x: number; y: number };

export interface Drawing {
  id: number;
  type: string;
  x?: number;
  y?: number;
  points?: number[];
  text?: string;
  fontSize?: number;
  draggable?: boolean;
  width?: number;
  rotation?: number;
  temporary?: boolean;
  attachedTo?: "player" | "ball" | null;
  attachedIndex?: number | null;

  // propriétés optionnelles pour les lignes/flèches
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  tension?: number;
}

export interface Step {
  time: number;
  players: Vec2[];
  ball: Vec2; // ✅ le ballon est un objet Vec2
  playerWithBall: number | null;
  ballOffset: Vec2 | null;
  comment?: string;
  drawings: Drawing[];
  dragPaths: { [key: string]: Vec2[] }; // au lieu de { [key: number]: Vec2[] }
  arrowPaths: { [key: string]: number[] };
}

export interface System {
  id: string;
  label: string;
  recording: Step[];
}

export function useTacticsBoard() {
  const PLAYER_COUNT = 10;
  // const playerRadius = 30;
  // const ballRadius = 15;
  const PROXIMITY_THRESHOLD = 50;

  const initialPositions = Array.from({ length: PLAYER_COUNT }, (_, i) => ({
    x: 50 + i * 80,
    y: 15,
  }));

  const initialBallPosition = { x: 501, y: 250 };

  const presetSystem = [
    {
      time: 1745004451259,
      players: [
        { x: 100, y: 100 },
        { x: 180, y: 100 },
        { x: 260, y: 100 },
        { x: 340, y: 100 },
        { x: 420, y: 100 },
      ],
      ball: { x: 400, y: 250 },
      comment: "",
    },
  ];

  const [systems, setSystems] = useState<System[]>([
    { id: "main", label: "Système Principal", recording: [] },
  ]);
  const [currentSystemId, setCurrentSystemId] = useState("main");
  const [players, setPlayers] = useState(initialPositions);
  const [ball, setBall] = useState(initialBallPosition);
  const [ballOffset, setBallOffset] = useState<{ x: number; y: number } | null>(
    null
  );

  const [playerRadius, setPlayerRadius] = useState(30);
  const [ballRadius, setBallRadius] = useState(30);

  const [showArrows, setShowArrows] = useState(true);

  const [arrowProgress, setArrowProgress] = useState<{
    [playerId: string]: number; // 0 → 1
  }>({});

  const [previewArrows, setPreviewArrows] = useState<{
    [key: string]: { x: number; y: number }[];
  }>({});

  const [isRecording, setIsRecording] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1200);
  const [currentComment, setCurrentComment] = useState("");
  const [dragPath, setDragPath] = useState<{
    [key: string]: { x: number; y: number }[];
  }>({});

  const [lastDragTime, setLastDragTime] = useState<{ [key: number]: number }>(
    {}
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [currentDragPaths, setCurrentDragPaths] = useState<{
    [key: number]: { x: number; y: number }[];
  } | null>(null);

  const [replayIndex, setReplayIndex] = useState(0);
  const [playerWithBall, setPlayerWithBall] = useState<number | null>(null);
  const [playersDirection, setPlayersDirection] = useState(
    Array(PLAYER_COUNT).fill(false)
  );

  const [drawMode, setDrawMode] = useState(""); // "arrow", "screen", "line", "erase"
  const [drawing, setDrawing] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [newShapePoints, setNewShapePoints] = useState<number[]>([]);

  const intervalRef = useRef<number | null>(null);
  const playersRef = useRef(players);
  const ballRef = useRef(ball);

  useEffect(() => {
    const updateRadii = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setPlayerRadius(65);
        setBallRadius(60);
      } else if (width < 768) {
        setPlayerRadius(40);
        setBallRadius(40);
      } else if (width < 1024) {
        setPlayerRadius(40);
        setBallRadius(40);
      } else {
        setPlayerRadius(40);
        setBallRadius(30);
      }
    };

    updateRadii(); // initialisation
    window.addEventListener("resize", updateRadii);

    return () => window.removeEventListener("resize", updateRadii);
  }, []);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);

  const currentSystem = systems.find((s) => s.id === currentSystemId);

  const stepProgress = currentSystem
    ? `${replayIndex + 1} / ${currentSystem.recording.length}`
    : "0 / 0";

  const checkCollision = () => {
    for (let i = 0; i < players.length; i++) {
      const dx = ball.x - players[i].x;
      const dy = ball.y - players[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= playerRadius + ballRadius) {
        setPlayerWithBall(i);
        setBallOffset({ x: dx, y: dy });
        return;
      }
    }
    setPlayerWithBall(null);
    setBallOffset(null);
  };

  const checkProximity = () => {
    const updated = [...playersDirection];
    players.forEach((p, i) => {
      const dx = p.x - ball.x;
      const dy = p.y - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      updated[i] = dist <= PROXIMITY_THRESHOLD;
    });
    setPlayersDirection(updated);
  };

  const getPlayerColor = (i: number) => {
    if (playerWithBall === i) return "orange";
    if (playersDirection[i]) return "blue";
    return i < 5 ? "#212121" : "grey";
  };

  // const handleDragStart = (index: number) => {
  //   setDragPath((prev) => ({ ...prev, [index]: [] }));
  // };

  const handleDragStart = (index: number) => {
    const startPos = players[index];
    setDragPath((prev) => {
      const existing = prev[index] || [];
      return {
        ...prev,
        [index]: [...existing, { x: startPos.x, y: startPos.y }],
      };
    });
  };

  const handleDragMove = (
    index: number,
    e: Konva.KonvaEventObject<DragEvent>
  ) => {
    if (isReplaying) return;

    const now = Date.now();
    const last = lastDragTime[index] || 0;

    const newX = e.target.x();
    const newY = e.target.y();

    const dx = newX - players[index].x;
    const dy = newY - players[index].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (now - last > 30 || dist > 8) {
      // ✅ Déplacer le joueur
      setPlayers((p) => {
        const copy = [...p];
        copy[index] = { x: newX, y: newY };
        return copy;
      });

      // ✅ Si ce joueur a la balle, déplacer la balle avec lui
      if (playerWithBall === index && ballOffset) {
        setBall({
          x: newX + ballOffset.x,
          y: newY + ballOffset.y,
        });
      }

      // 🟡 Enregistrer le chemin complet sans écraser l'ancien
      setDragPath((prev) => {
        const existingPath = prev[index] || [];
        const lastPoint = existingPath[existingPath.length - 1];

        // On évite de dupliquer des points trop proches
        if (lastPoint) {
          const ddx = newX - lastPoint.x;
          const ddy = newY - lastPoint.y;
          if (Math.sqrt(ddx * ddx + ddy * ddy) < 8) {
            return prev; // ⛔️ on ne réécrit pas si déplacement trop faible
          }
        }

        const updatedPath = [...existingPath, { x: newX, y: newY }];
        return {
          ...prev,
          [index]: updatedPath,
        };
      });

      setLastDragTime((prev) => ({ ...prev, [index]: now }));
    }
  };

  const handlePlayerDoubleClick = (index: number) => {
    const player = players[index];
    if (!player) return;

    // Ajouter un dessin "T" sur le terrain à la position du joueur
    setDrawings((prev) => [
      ...prev,
      {
        type: "T", // Type de dessin : on pourra le gérer dans ton rendu
        x: player.x,
        y: player.y,
        id: Date.now(),
      },
    ]);
  };

  const handleBallDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isReplaying) return;

    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    setBall({ x: newX, y: newY });

    // Stocker seulement le point A et B
    setDragPath((prev) => ({
      ...prev,
      ball: [
        prev.ball && prev.ball.length > 0
          ? prev.ball[0]
          : { x: ball.x, y: ball.y }, // start
        { x: newX, y: newY }, // end
      ],
    }));

    setPlayerWithBall(null);
    setBallOffset(null);
    checkCollision();
  };

  // const addStep = () => {
  //   if (!currentSystem) return;
  //   const now = Date.now();
  //   const dragPathsWithBall = { ...dragPath };

  //   const arrowPaths = Object.fromEntries(
  //     Object.entries(dragPathsWithBall).map(([key, path]) => {
  //       const points: number[] = [];
  //       path.forEach((p) => points.push(p.x, p.y));
  //       return [key, points];
  //     })
  //   );

  //   const filteredDrawings = drawings;
  //   const newStep = {
  //     time: now,
  //     players: [...players],
  //     ball: { ...ball },
  //     playerWithBall,
  //     ballOffset,
  //     commentIds: filteredDrawings
  //       .filter((d) => d.type === "comment")
  //       .map((d) => d.id),
  //     drawings: filteredDrawings,
  //     dragPaths: dragPathsWithBall,
  //     arrowPaths,
  //   };

  //   let newRecording = [...currentSystem.recording];
  //   const lastStep = newRecording[newRecording.length - 1];

  //   // 🟡 On fusionne si le dernier step est proche dans le temps (ex: double clic rapide)
  //   const isCloseInTime = lastStep && now - lastStep.time < 1500; // 1,5 sec max

  //   if (isCloseInTime && lastStep) {
  //     // Fusionner les chemins
  //     const mergedDragPaths = { ...lastStep.dragPaths };

  //     for (const key of Object.keys(newStep.dragPaths)) {
  //       mergedDragPaths[key] = [
  //         ...(mergedDragPaths[key] || []),
  //         ...newStep.dragPaths[key],
  //       ];
  //     }

  //     newRecording[newRecording.length - 1] = {
  //       ...lastStep,
  //       players: [...players],
  //       ball: { ...ball },
  //       dragPaths: mergedDragPaths,
  //       arrowPaths: Object.fromEntries(
  //         Object.entries(mergedDragPaths).map(([k, path]) => [
  //           k,
  //           path.flatMap((p) => [p.x, p.y]),
  //         ])
  //       ),
  //     };
  //   } else {
  //     newRecording.push(newStep);
  //   }

  //   setSystems((prev) =>
  //     prev.map((s) =>
  //       s.id === currentSystemId ? { ...s, recording: newRecording } : s
  //     )
  //   );

  //   // 🧹 Nettoyage après ajout
  //   setDrawings((prev) => prev.filter((d) => d.type !== "T" || !d.temporary));
  //   setDragPath({});
  //   setCurrentComment("");
  //   setDrawMode("");
  // };

  const addStep = () => {
    if (!currentSystem) return;

    const now = Date.now();

    // ✅ On reconstruit le nouveau Step
    const dragPathsWithBall = { ...dragPath };

    const arrowPaths = Object.fromEntries(
      Object.entries(dragPathsWithBall).map(([key, path]) => {
        const points: number[] = [];
        path.forEach((p) => points.push(p.x, p.y));
        return [key, points];
      })
    );

    const filteredDrawings = drawings;
    const newStep: Step = {
      time: now,
      players: [...players],
      ball: { ...ball },
      playerWithBall,
      ballOffset,
      comment: currentComment,
      drawings: filteredDrawings,
      dragPaths: dragPathsWithBall,
      arrowPaths,
    };

    // ✅ LA RÈGLE IMPORTANTE :
    // Si l'utilisateur a navigué dans l'historique, on coupe le futur.
    setSystems((prev) =>
      prev.map((s) => {
        if (s.id !== currentSystemId) return s;

        const trimmedRecording = s.recording.slice(0, replayIndex + 1);

        return {
          ...s,
          recording: [...trimmedRecording, newStep],
        };
      })
    );

    // ✅ Met à jour l’index
    setReplayIndex((prev) => prev + 1);

    // 🔄 Reset des données de dessin
    setDragPath({});
    setCurrentComment("");
    setDrawMode("");
  };

  const smoothTransition = (
    start: any,
    end: any,
    duration = replaySpeed,
    onFinish?: () => void
  ) => {
    const frames = 40;
    const interval = duration / frames;
    let step = 0;

    const animate = () => {
      step++;
      const t = step / frames;
      if (t > 1) {
        onFinish?.();
        return;
      }

      const newPlayers = start.players.map((p: any, i: number) => ({
        x: p.x + (end.players[i].x - p.x) * t,
        y: p.y + (end.players[i].y - p.y) * t,
      }));

      let newBall;
      if (playerWithBall !== null && ballOffset) {
        newBall = {
          x: newPlayers[playerWithBall].x + ballOffset.x,
          y: newPlayers[playerWithBall].y + ballOffset.y,
        };
      } else {
        newBall = {
          x: start.ball.x + (end.ball.x - start.ball.x) * t,
          y: start.ball.y + (end.ball.y - start.ball.y) * t,
        };
      }

      setPlayers(newPlayers);
      setBall(newBall);
      checkCollision();

      requestAnimationFrame(animate);
    };

    animate();
  };

  // 🔄 Nouvelle fonction pour replay avec flèche
  // 🔄 Replay des chemins avec flèches visibles avant le mouvement
  const replayDragPathsWithArrow = (
    paths: { [key: string]: { x: number; y: number }[] },
    playerWithBallInStep: number | null,
    ballOffsetInStep: { x: number; y: number } | null,
    onFinish: () => void,
    ballDelay = 0 // délai en ms pour la passe
  ) => {
    const keys = Object.keys(paths);
    const startTime = performance.now();
    const duration = replaySpeed;

    const getPointAtProgress = (
      path: { x: number; y: number }[],
      t: number
    ) => {
      if (!path || path.length < 2) return path[0] || { x: 0, y: 0 };
      const totalLen = path.reduce(
        (len, p, i) =>
          i > 0
            ? len + Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y)
            : 0,
        0
      );
      let target = t * totalLen;
      for (let i = 1; i < path.length; i++) {
        const segLen = Math.hypot(
          path[i].x - path[i - 1].x,
          path[i].y - path[i - 1].y
        );
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
    };

    const animate = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);

      setPlayers((prevPlayers) => {
        const updated = [...prevPlayers];
        let newBall = ballRef.current;

        keys.forEach((key) => {
          const path = paths[key];
          if (!path || path.length === 0) return;

          if (path.length === 1) {
            if (key === "ball") newBall = path[0];
            else updated[parseInt(key)] = path[0];
            return;
          }

          if (key !== "ball") {
            const pos = t * (path.length - 1);
            const i = Math.floor(pos);
            const nextIndex = Math.min(i + 1, path.length - 1);
            const p0 = path[i];
            const p1 = path[nextIndex];
            if (!p0 || !p1) return;

            const frac = pos - i;
            updated[parseInt(key)] = {
              x: p0.x + (p1.x - p0.x) * frac,
              y: p0.y + (p1.y - p0.y) * frac,
            };
          }
        });

        const ballPath = paths["ball"];
        if (ballPath && ballPath.length > 1) {
          // balle suit le chemin des flèches orange
          let ballT = t;

          if (
            playerWithBallInStep !== null &&
            ballOffsetInStep &&
            updated[playerWithBallInStep]
          ) {
            const isPlayerMoving =
              paths[playerWithBallInStep.toString()]?.length! > 1;
            if (!isPlayerMoving && ballDelay > 0) {
              if (time - startTime < ballDelay) ballT = 0;
              else
                ballT = Math.min(
                  (time - startTime - ballDelay) / (duration - ballDelay),
                  1
                );
            }
          }

          newBall = getPointAtProgress(ballPath, ballT);
        } else if (
          playerWithBallInStep !== null &&
          ballOffsetInStep &&
          updated[playerWithBallInStep]
        ) {
          // pas de flèche → balle suit le joueur
          newBall = {
            x: updated[playerWithBallInStep].x + ballOffsetInStep.x,
            y: updated[playerWithBallInStep].y + ballOffsetInStep.y,
          };
        }

        setBall(newBall);
        return updated;
      });

      if (t < 1) requestAnimationFrame(animate);
      else onFinish();
    };

    requestAnimationFrame(animate);
  };

  const handleReplay = () => {
    if (!currentSystem || !currentSystem.recording.length) return;

    // 🔹 Commencer avec la première étape du recording
    const firstStep = currentSystem.recording[0];
    setPlayers(firstStep.players);
    setBall(firstStep.ball);
    setPlayerWithBall(firstStep.playerWithBall ?? null);
    setBallOffset(firstStep.ballOffset ?? null);
    setCurrentComment(firstStep.comment || "");
    setDrawings(firstStep.drawings || []);
    setReplayIndex(0);

    setIsReplaying(true);
    setIsPaused(false);
    setSelectedId(0);
  };

  useEffect(() => {
    if (!isReplaying || isPaused || !currentSystem) return;

    const playStep = (index: number) => {
      const current = currentSystem.recording[index];
      const next = currentSystem.recording[index + 1];
      if (!next) {
        setIsReplaying(false);
        setCurrentComment("");
        return;
      }

      setCurrentComment(next.comment || "");
      setDrawings(next.drawings || []);

      const nextIndex = index + 1;

      if (next.dragPaths && Object.keys(next.dragPaths).length > 0) {
        // ✅ 1. On affiche les flèches immédiatement
        setPreviewArrows(next.dragPaths);

        // ✅ 2. On attend 1 seconde avant de lancer le déplacement
        setTimeout(() => {
          // ⛔️ NE PAS effacer ici ! (on veut la flèche pendant l'anim)

          // 3️⃣ Lancer l'animation du déplacement
          replayDragPathsWithArrow(
            next.dragPaths,
            next.playerWithBall ?? null,
            next.ballOffset ?? null,
            () => {
              // ✅ 4. Quand le déplacement est terminé → on retire la flèche
              setPreviewArrows({});

              setPlayerWithBall(next.playerWithBall ?? null);
              setBallOffset(next.ballOffset ?? null);
              setReplayIndex(nextIndex);
              playStep(nextIndex);
            }
          );
        }, 100);
      } else {
        // 🔹 Pas de déplacement → mise à jour immédiate
        setPlayers(next.players);
        setBall(next.ball);

        checkCollision();

        if (playerWithBall !== null && ballOffset) {
          setBall({
            x: next.players[playerWithBall].x + ballOffset.x,
            y: next.players[playerWithBall].y + ballOffset.y,
          });
        }

        setPlayerWithBall(next.playerWithBall ?? null);
        setBallOffset(next.ballOffset ?? null);
        setReplayIndex(nextIndex);
        playStep(nextIndex);
      }
    };

    playStep(replayIndex);
  }, [isReplaying, isPaused, currentSystem, replayIndex]);

  const togglePause = () => setIsPaused((prev) => !prev);

  const goToStep = (index: number, { truncate = false } = {}) => {
    if (!currentSystem) return;
    const steps = currentSystem.recording;
    if (index < 0 || index >= steps.length) return;

    const step = steps[index];
    setPlayers(step.players);
    setBall(step.ball);
    setCurrentComment(step.comment || "");
    setDrawings(step.drawings || []);
    // setDrawMode(step.drawMode || ""); // ✅ ajout important
    setDrawMode("");
    setReplayIndex(index);

    if (truncate) {
      setSystems((prev) =>
        prev.map((s) =>
          s.id === currentSystemId
            ? { ...s, recording: s.recording.slice(0, index + 1) }
            : s
        )
      );
    }
  };

  const playPresetSystem = () => {
    if (!presetSystem.length) return;
    let i = 0;
    setIsReplaying(true);
    setIsPaused(false);

    const run = () => {
      if (i >= presetSystem.length - 1) {
        setIsReplaying(false);
        return;
      }
      const current = presetSystem[i];
      const next = presetSystem[i + 1];
      smoothTransition(current, next, replaySpeed);
      setCurrentComment(next.comment || "");
      i++;
      setTimeout(run, replaySpeed + 100);
    };

    setPlayers(presetSystem[0].players);
    setBall(presetSystem[0].ball);
    setCurrentComment(presetSystem[0].comment || "");
    setTimeout(run, 300);
  };

  const handleCommentDragMove = (id: number, e: any) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    setDrawings((prev) =>
      prev.map((d) => (d.id === id ? { ...d, x: newX, y: newY } : d))
    );
  };

  const handleMouseDown = (e: any) => {
    if (isReplaying || isRecording) return;
    const pos = e.target.getStage().getPointerPosition();

    if (drawMode === "comment") {
      setDrawings((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "comment",
          x: pos.x,
          y: pos.y,
          text: "Double-cliquez pour éditer",
          fontSize: 16,
          draggable: true,
        },
      ]);
      setDrawMode("");
      return;
    }

    if (drawMode === "T") {
      setDrawings((prev) => [
        ...prev,
        {
          type: "T",
          id: Date.now(),
          x: pos.x,
          y: pos.y,
          rotation: 0,
          temporary: true,
        },
      ]);
      setDrawMode(""); // ❌ Désactive le mode T après placement
      return;
    }

    setDrawing(true);
    setNewShapePoints([pos.x, pos.y]);
  };

  const handleMouseMove = (e: any) => {
    if (!drawing) return;
    const pos = e.target.getStage().getPointerPosition();
    setNewShapePoints((prev) => [...prev, pos.x, pos.y]);
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);

    if (drawMode === "erase") {
      setDrawings((prev) => prev.slice(0, -1));
    } else {
      setDrawings((prev) => [
        ...prev,
        { type: drawMode, points: newShapePoints, id: Date.now() },
      ]);
    }

    setNewShapePoints([]);
    setDrawMode("");
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentComment(e.target.value);
  };

  const updateCommentText = (id: number, text: string) => {
    setDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, text } : d)));
  };

  function addCommentAt({
    x,
    y,
    text = "",
    attachTo = null,
    playerIndex = null,
  }: {
    x?: number;
    y?: number;
    text?: string;
    attachTo?: "player" | "ball" | null;
    playerIndex?: number | null;
  }) {
    // calculer position si on attache au joueur ou à la balle
    let cx = x ?? 100;
    let cy = y ?? 100;
    if (attachTo === "player" && typeof playerIndex === "number") {
      const p = players[playerIndex];
      if (p) {
        cx = p.x + 50; // offset à droite du joueur (ajuste selon taille)
        cy = p.y - 10;
      }
    } else if (attachTo === "ball") {
      cx = ball.x + 30;
      cy = ball.y - 10;
    }

    const newComment = {
      id: Date.now(),
      type: "comment",
      x: cx,
      y: cy,
      text: text || "Commentaire...",
      fontSize: 14,
      width: 140,
      draggable: true,
      visibleDuringReplay: true, // flag pour contrôle
      attachedTo: attachTo, // sauvegarde si on veut ré-attacher plus tard
      attachedIndex: playerIndex,
    };

    setDrawings((prev: any[]) => [...prev, newComment]);
    return newComment.id;
  }

  const removeDrawing = (id: number) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  };

  // Ajouter à la fin de ton hook, avant le return
  const handleReset = () => {
    setPlayers(initialPositions); // Repositionne les joueurs
    setBall(initialBallPosition); // Repositionne la balle
    setPlayerWithBall(null); // Aucun joueur avec la balle
    setBallOffset(null); // Réinitialise l'offset de la balle
    setDragPath({}); // Efface les chemins de drag
    setPreviewArrows({}); // Cache toutes les flèches
    setDrawings([]); // Efface tous les dessins temporaires
    setCurrentComment(""); // Réinitialise le commentaire
    setReplayIndex(0); // Repart au premier step
    setIsReplaying(false); // Stoppe toute lecture en cours
    setIsPaused(false); // Désactive le pause
    setSelectedId(null); // Déselectionne tout
  };

  return {
    handleReset,
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
    playerRadius,
    ballRadius,
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
    goToStep,
    replayIndex,
    stepProgress,
    setCurrentComment,
    handleCommentChange,
    setDrawings,
    setPlayers,
    setBall,
    setIsReplaying,
    selectedId,
    setSelectedId,
    previewArrows,
    playerWithBall,
    handleCommentDragMove,
    updateCommentText,
    addCommentAt,
    removeDrawing,
    showArrows,
    setShowArrows,
  };
}

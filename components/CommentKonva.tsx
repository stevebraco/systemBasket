import { Group, Rect, Text } from "react-konva";
import { Html } from "react-konva-utils";
import { useState, useEffect } from "react";
import { Textarea } from "./ui/textarea";

export function CommentKonva({
  comment,
  updateText,
  removeComment,
  isRecordingOrReplay,
  handleCommentDragMove,
}: {
  comment: any;
  updateText: (id: number, text: string) => void;
  removeComment: (id: number) => void;
  isRecordingOrReplay: boolean;
  handleCommentDragMove: (id: number, e: any) => void;
}) {
  const [draftText, setDraftText] = useState(comment.text);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => setDraftText(comment.text), [comment.text]);

  const handleBlur = () => {
    setIsEditing(false);
    updateText(comment.id, draftText);
  };

  const contentWidth = comment.width || 160; // largeur utile pour le texte
  const contentHeight = 70; // hauteur utile pour le texte
  const border = 12; // épaisseur de la bordure cliquable
  const totalWidth = contentWidth + border * 2; // taille totale du groupe
  const totalHeight = contentHeight + border * 2;

  return (
    <Group
      x={comment.x}
      y={comment.y}
      width={totalWidth}
      height={totalHeight}
      draggable={!isRecordingOrReplay}
      onDragMove={(e) => handleCommentDragMove(comment.id, e)} // ✅ mise à jour position
    >
      {/* fond du bloc */}
      <Rect
        x={0}
        y={0}
        width={totalWidth}
        height={totalHeight}
        fill="#2A2D3F"
        cornerRadius={6}
      />

      {/* ---- Zones de drag : 4 côtés ---- */}
      {!isRecordingOrReplay && (
        <>
          {/* haut */}
          <Rect
            x={0}
            y={0}
            width={totalWidth}
            height={border}
            fill="transparent"
          />
          {/* bas */}
          <Rect
            x={0}
            y={totalHeight - border}
            width={totalWidth}
            height={border}
            fill="transparent"
          />
          {/* gauche */}
          <Rect
            x={0}
            y={0}
            width={border}
            height={totalHeight}
            fill="transparent"
          />
          {/* droite */}
          <Rect
            x={totalWidth - border}
            y={0}
            width={border}
            height={totalHeight}
            fill="transparent"
          />
        </>
      )}

      {/* zone centrale : textarea ou texte */}
      {isRecordingOrReplay ? (
        <Text
          x={border + 5}
          y={border + 5}
          width={contentWidth - 10}
          height={contentHeight - 10}
          text={draftText}
          fill="white"
          fontSize={14}
          wrap="word"
        />
      ) : (
        <Html
          divProps={{
            style: {
              position: "absolute",
              left: "3px",
              top: "15px",
              width: contentWidth,
              height: contentHeight,
              pointerEvents: "auto",
            },
          }}
        >
          <Textarea
            className="w-[180px] h-full resize-none overflow-auto bg-[#2A2D3F] text-white border border-transparent rounded-md p-1.5 text-sm focus-visible:ring-0 focus-visible:outline-none"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            style={{ height: 70 }} // 👈 hauteur fixe en px
          />
        </Html>
      )}

      {/* bouton fermer */}
      {!isRecordingOrReplay && (
        <Text
          x={totalWidth - 20}
          y={4}
          width={16}
          height={16}
          text="✕"
          fontSize={14}
          fill="red"
          onClick={() => removeComment(comment.id)}
          onTap={() => removeComment(comment.id)} // Mobile/tablette 🔥
        />
      )}
    </Group>
  );
}

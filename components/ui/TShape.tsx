"use client";

import React, { useRef, useEffect } from "react";
import { Group, Rect, Transformer } from "react-konva";

interface TShapeProps {
  shapeProps: {
    id: number;
    x: number;
    y: number;
    rotation: number;
  };
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: any) => void;
}

const TShape: React.FC<TShapeProps> = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  // Quand sélectionné → relie le Transformer à la forme
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Group
        ref={shapeRef}
        x={shapeProps.x + 35}
        y={shapeProps.y + 60}
        rotation={shapeProps.rotation}
        draggable
        // ✅ Sélection universelle (desktop + mobile + tablette + stylet)
        onPointerDown={(e) => {
          e.cancelBubble = true; // évite que le drag annule la sélection
          onSelect();
        }}
        // ✅ Mise à jour position lors du drag
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x() - 35,
            y: e.target.y() - 60,
          });
        }}
        // ✅ Rotation terminée → maj props
        onTransformEnd={() => {
          const node = shapeRef.current;
          onChange({ ...shapeProps, rotation: node.rotation() });
        }}
      >
        {/* Corps du T */}
        <Rect x={-5} y={-20} width={15} height={35} fill="black" />
        <Rect x={-22} y={-20} width={50} height={13} fill="black" />
      </Group>

      {/* ✅ Transformer (rotation seulement) */}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[]} // empêche redimension
          onPointerDown={(e) => (e.cancelBubble = true)} // évite perte de sélection sur iPad
        />
      )}
    </>
  );
};

export default TShape;

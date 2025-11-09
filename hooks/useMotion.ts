import { useState, useEffect } from "react";
import { useSpring } from "framer-motion";

export function useMotionPosition(startX: number, startY: number) {
  const [position, setPosition] = useState({ x: startX, y: startY });

  // ✅ Ajustement des paramètres pour un mouvement plus réaliste
  const springConfig = {
    stiffness: 200, // rigidité du ressort
    damping: 20, // amortissement
    mass: 1, // masse du joueur
  };

  const xSpring = useSpring(startX, springConfig);
  const ySpring = useSpring(startY, springConfig);

  const moveTo = (newX: number, newY: number) => {
    xSpring.set(newX);
    ySpring.set(newY);
  };

  useEffect(() => {
    const unsubX = xSpring.onChange((v) =>
      setPosition((p) => ({ ...p, x: v }))
    );
    const unsubY = ySpring.onChange((v) =>
      setPosition((p) => ({ ...p, y: v }))
    );
    return () => {
      unsubX();
      unsubY();
    };
  }, [xSpring, ySpring]);

  return { position, moveTo };
}

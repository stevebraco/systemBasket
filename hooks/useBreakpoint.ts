import { useState, useEffect, use } from "react";

function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<"sm" | "md" | "lg" | "xl">("lg");

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint("sm");
      else if (width < 768) setBreakpoint("md");
      else if (width < 1024) setBreakpoint("lg");
      else setBreakpoint("xl");
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return breakpoint;
}

export default useBreakpoint;

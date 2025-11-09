import { useEffect, useState } from "react";

function useImage(url: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}

export default useImage;

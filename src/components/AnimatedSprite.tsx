import { useRef, useEffect, useCallback } from 'react';

interface AnimatedSpriteProps {
  src: string;
  frames: number;
  frameWidth: number;
  frameHeight: number;
  frameDuration?: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const AnimatedSprite = ({
  src,
  frames,
  frameWidth,
  frameHeight,
  frameDuration = 150,
  size = 96,
  className,
  style,
}: AnimatedSpriteProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const frameRef  = useRef(0);
  const timerRef  = useRef(0);
  const rafRef    = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const img = imgRef.current;
    if (!ctx || !img || !img.complete) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, frameRef.current * frameWidth, 0, frameWidth, frameHeight, 0, 0, size, size);
  }, [frameWidth, frameHeight, size]);

  useEffect(() => {
    const img = new Image();
    imgRef.current = img;
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = src;
    if (img.complete) draw();
  }, [src, draw]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last; last = now;
      timerRef.current += dt;
      if (timerRef.current >= frameDuration) {
        timerRef.current -= frameDuration;
        frameRef.current = (frameRef.current + 1) % frames;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, frameDuration, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated', width: size, height: size, display: 'block', ...style }}
    />
  );
};

export default AnimatedSprite;

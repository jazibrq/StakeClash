import { useEffect, useRef, useCallback, useState } from 'react';
import type { CSSProperties } from 'react';

interface VideoBackgroundProps {
  overlayOpacity?: number;
}

export const VideoBackground = ({ overlayOpacity = 0.5 }: VideoBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const [warpActive, setWarpActive] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);

  // Easy toggle + tuning
  const enableWarp = true;
  const warpRadius = 180; // px
  const warpStrength = 14; // px displacement
  const chromaOffset = 0.6; // px, subtle
  const cursorEase = 0.12;

  const handleCanPlayThrough = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration - video.currentTime < 0.08) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!video || !canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer =
      window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

    if (prefersReducedMotion || isCoarsePointer) {
      setWarpActive(false);
      setFallbackActive(false);
      return;
    }

    let useWebgl = false;
    let gl: WebGLRenderingContext | null = null;

    if (enableWarp) {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false });
      useWebgl = !!gl;
    }

    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;

      void main() {
        v_uv = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;

      uniform sampler2D u_video;
      uniform vec2 u_resolution;
      uniform vec2 u_cursor;
      uniform float u_radius;
      uniform float u_strength;
      uniform float u_chromatic;

      varying vec2 v_uv;

      void main() {
        vec2 pos = v_uv * u_resolution;
        vec2 toCursor = pos - u_cursor;
        float dist = length(toCursor);
        float falloff = smoothstep(u_radius, 0.0, dist);
        float lens = falloff * falloff;
        vec2 dir = dist > 0.0 ? toCursor / dist : vec2(0.0);

        vec2 displacement = dir * u_strength * lens;
        vec2 samplePos = pos - displacement;
        vec2 uv = clamp(samplePos / u_resolution, 0.0, 1.0);

        vec2 chroma = dir * u_chromatic * lens / u_resolution;
        vec3 color;
        color.r = texture2D(u_video, clamp(uv + chroma, 0.0, 1.0)).r;
        color.g = texture2D(u_video, uv).g;
        color.b = texture2D(u_video, clamp(uv - chroma, 0.0, 1.0)).b;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    let program: WebGLProgram | null = null;
    let resolutionLocation: WebGLUniformLocation | null = null;
    let cursorLocation: WebGLUniformLocation | null = null;
    let radiusLocation: WebGLUniformLocation | null = null;
    let strengthLocation: WebGLUniformLocation | null = null;
    let chromaLocation: WebGLUniformLocation | null = null;
    let texture: WebGLTexture | null = null;

    if (useWebgl && gl) {
      const compileShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
      if (!vertexShader || !fragmentShader) {
        useWebgl = false;
      } else {
        program = gl.createProgram();
        if (!program) {
          useWebgl = false;
        } else {
          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            useWebgl = false;
          } else {
            gl.useProgram(program);

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
              gl.STATIC_DRAW
            );

            const positionLocation = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
            cursorLocation = gl.getUniformLocation(program, 'u_cursor');
            radiusLocation = gl.getUniformLocation(program, 'u_radius');
            strengthLocation = gl.getUniformLocation(program, 'u_strength');
            chromaLocation = gl.getUniformLocation(program, 'u_chromatic');
          }
        }
      }
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      if (!canvas) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      if (useWebgl && gl && resolutionLocation) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    if (useWebgl && gl && radiusLocation && strengthLocation && chromaLocation) {
      gl.uniform1f(radiusLocation, warpRadius * dpr);
      gl.uniform1f(strengthLocation, warpStrength * dpr);
      gl.uniform1f(chromaLocation, chromaOffset * dpr);
    }

    let targetX = width * 0.5;
    let targetY = height * 0.5;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = 0;

    const updateCursor = (event: MouseEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const onPointerLeave = () => {
      targetX = width * 0.5;
      targetY = height * 0.5;
    };

    window.addEventListener('mousemove', updateCursor, { passive: true });
    window.addEventListener('mouseleave', onPointerLeave);

    const render = () => {
      rafId = requestAnimationFrame(render);
      resize();

      currentX += (targetX - currentX) * cursorEase;
      currentY += (targetY - currentY) * cursorEase;

      if (fallback) {
        fallback.style.setProperty('--cursor-x', `${currentX}px`);
        fallback.style.setProperty('--cursor-y', `${currentY}px`);
      }

      if (useWebgl && gl && texture && cursorLocation) {
        if (video.readyState >= 2) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        }

        gl.uniform2f(cursorLocation, currentX * dpr, currentY * dpr);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };

    setWarpActive(useWebgl);
    setFallbackActive(!useWebgl);
    render();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', updateCursor);
      window.removeEventListener('mouseleave', onPointerLeave);
    };
  }, [enableWarp, chromaOffset, cursorEase, warpRadius, warpStrength]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        // @ts-ignore - webkit-playsinline for iOS Safari
        webkit-playsinline=""
        onCanPlayThrough={handleCanPlayThrough}
        onTimeUpdate={handleTimeUpdate}
        className={`absolute inset-0 w-full h-full object-cover ${
          warpActive ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <source src="/videos/realbackgroundvideo.mp4" type="video/mp4" />
      </video>

      {/* WebGL warp canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${warpActive ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Dark overlay for text readability - starts below navigation */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: '80px', // Start below the navigation header
          background: `linear-gradient(180deg,
            hsl(220 25% 4% / ${overlayOpacity}) 0%,
            hsl(220 25% 6% / ${overlayOpacity * 0.9}) 50%,
            hsl(220 25% 4% / ${overlayOpacity}) 100%
          )`,
        }}
      />

      {/* Subtle vignette - starts below navigation */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: '80px', // Start below the navigation header
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(220 25% 4% / 0.4) 100%)',
        }}
      />

      {/* CSS fallback refraction hint */}
      {fallbackActive && (
        <div
          ref={fallbackRef}
          className="absolute inset-0 cursor-refraction-fallback"
          style={{ '--cursor-x': '50%', '--cursor-y': '50%' } as CSSProperties}
        />
      )}
    </div>
  );
};

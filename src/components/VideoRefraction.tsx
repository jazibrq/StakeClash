import { useEffect, useRef, useCallback } from 'react';

interface VideoRefractionProps {
  videoElement: HTMLVideoElement | null;
  enabled?: boolean;
  radius?: number;
  strength?: number;
}

/**
 * LIQUID REFRACTION WARP
 *
 * Creates a cursor-following lens that warps/refracts the video background
 * - Primary: WebGL shader-based displacement (real pixel warping)
 * - Fallback: CSS radial highlight (lightweight, no warp)
 * - Respects prefers-reduced-motion
 * - Disabled on mobile/tablets for performance
 */
export const VideoRefraction = ({
  videoElement,
  enabled = true,
  radius = 160,
  strength = 0.015,
}: VideoRefractionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const rafRef = useRef<number>(0);
  const textureRef = useRef<WebGLTexture | null>(null);

  // Check if device is mobile/tablet
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.targetX = e.clientX;
    mouseRef.current.targetY = window.innerHeight - e.clientY; // Flip Y for WebGL
  }, []);

  useEffect(() => {
    // Skip on mobile or if motion reduced or disabled
    if (isMobile() || prefersReducedMotion() || !enabled || !videoElement) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL not supported, refraction effect disabled');
      return;
    }

    glRef.current = gl;

    // Vertex shader - simple pass-through
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader - refraction displacement
    const fragmentShaderSource = `
      precision mediump float;

      uniform sampler2D u_texture;
      uniform vec2 u_mouse;
      uniform vec2 u_resolution;
      uniform float u_radius;
      uniform float u_strength;

      varying vec2 v_texCoord;

      void main() {
        vec2 uv = v_texCoord;
        vec2 pixelCoord = gl_FragCoord.xy;

        // Distance from cursor
        float dist = distance(pixelCoord, u_mouse);

        if (dist < u_radius) {
          // Smooth falloff from center to edge
          float factor = smoothstep(u_radius, 0.0, dist);
          factor = pow(factor, 1.5); // Sharper falloff for more localized effect

          // Direction from cursor
          vec2 direction = normalize(pixelCoord - u_mouse);

          // Radial displacement (push pixels outward from cursor)
          vec2 offset = direction * factor * u_strength;

          // Apply displacement to UV coordinates
          uv += offset;
        }

        // Sample video texture with displaced coordinates
        gl_FragColor = texture2D(u_texture, uv);
      }
    `;

    // Compile shader
    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders');
      return;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);
    programRef.current = program;

    // Set up geometry (full-screen quad)
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create texture for video
    const texture = gl.createTexture();
    textureRef.current = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Get uniform locations
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const radiusLocation = gl.getUniformLocation(program, 'u_radius');
    const strengthLocation = gl.getUniformLocation(program, 'u_strength');

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Set uniforms
    gl.uniform1f(radiusLocation, radius);
    gl.uniform1f(strengthLocation, strength);

    // Render loop
    const render = () => {
      if (!gl || !program || !texture) return;

      // Smooth cursor interpolation (easing)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Update video texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

      // Update mouse uniform
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    render();

    // Add mouse listener
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);

      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (program) gl.deleteProgram(program);
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
      }
    };
  }, [videoElement, enabled, radius, strength, isMobile, prefersReducedMotion, handleMouseMove]);

  // Don't render canvas on mobile or if disabled
  if (isMobile() || prefersReducedMotion() || !enabled) {
    return null;
  }

  return (
    <>
      {/* WebGL canvas for refraction effect */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ mixBlendMode: 'normal' }}
      />

      {/* CSS-only fallback (shown if WebGL fails) */}
      <div className="refraction-fallback" />
    </>
  );
};

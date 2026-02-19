import { useEffect, useRef, useCallback } from 'react';

interface AnimatedBackgroundProps {
  intensity?: 'high' | 'medium' | 'low';
}

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  pulsePhase: number;
  hue: number;
  lightness: number;
  layer: number;
}

export const AnimatedBackground = ({ intensity = 'medium' }: AnimatedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ offset: 0, velocity: 0, targetOffset: 0 });
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const intensityMult = intensity === 'high' ? 1.3 : intensity === 'medium' ? 1 : 0.6;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.targetX = e.clientX;
    mouseRef.current.targetY = e.clientY;
  }, []);

  const handleScroll = useCallback(() => {
    const newOffset = window.scrollY;
    scrollRef.current.velocity = (newOffset - scrollRef.current.offset) * 0.015;
    scrollRef.current.targetOffset = newOffset;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const particleCount = Math.floor(180 * intensityMult);
      particlesRef.current = [];
      
      for (let i = 0; i < particleCount; i++) {
        const layer = Math.floor(Math.random() * 3); // 0 = back, 1 = mid, 2 = front
        const isVibrant = Math.random() > 0.6;
        
        // Different shades of blue and near-black
        const hueVariants = [
          185 + Math.random() * 20, // cyan-blue
          200 + Math.random() * 20, // blue
          210 + Math.random() * 15, // deep blue
          220 + Math.random() * 10, // darker blue
        ];
        const hue = hueVariants[Math.floor(Math.random() * hueVariants.length)];
        
        // Lightness: some vibrant, some near-black
        const lightness = isVibrant 
          ? 50 + Math.random() * 25 // vibrant blues
          : 8 + Math.random() * 20; // dark/black shades
        
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: (Math.random() * 3 + 1) * (0.5 + layer * 0.3),
          opacity: (Math.random() * 0.5 + 0.2) * (0.4 + layer * 0.3),
          speedX: (Math.random() - 0.5) * 0.8 * (0.5 + layer * 0.25),
          speedY: (Math.random() - 0.5) * 0.6 * (0.5 + layer * 0.25),
          pulsePhase: Math.random() * Math.PI * 2,
          hue,
          lightness,
          layer,
        });
      }
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const drawParticles = (
      ctx: CanvasRenderingContext2D,
      time: number,
      mouseX: number,
      mouseY: number
    ) => {
      const { width, height } = canvas;
      
      // Sort by layer for proper depth
      const sortedParticles = [...particlesRef.current].sort((a, b) => a.layer - b.layer);
      
      sortedParticles.forEach((particle) => {
        // Flowing motion with sine waves
        const flowX = Math.sin(time * 0.0003 + particle.pulsePhase) * 0.5 * (particle.layer + 1);
        const flowY = Math.cos(time * 0.0002 + particle.pulsePhase * 0.7) * 0.3 * (particle.layer + 1);
        
        // Update position with flow
        particle.x += particle.speedX + flowX;
        particle.y += particle.speedY + flowY;
        particle.pulsePhase += 0.008;
        
        // Mouse interaction - particles flow around cursor
        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150 + particle.layer * 50;
        
        if (dist < interactionRadius) {
          const force = (1 - dist / interactionRadius) * 0.8 * (particle.layer + 1) * 0.3;
          particle.x += (dx / dist) * force;
          particle.y += (dy / dist) * force;
        }
        
        // Scroll velocity influence
        particle.y += scrollRef.current.velocity * (particle.layer + 1) * 2;
        
        // Wrap around screen
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;
        
        // Pulsing opacity
        const pulse = 0.7 + 0.3 * Math.sin(particle.pulsePhase * 2);
        const currentOpacity = particle.opacity * pulse * intensityMult;
        
        // Draw particle with glow
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Outer glow for vibrant particles
        if (particle.lightness > 40) {
          const glowSize = particle.size * (4 + particle.layer);
          const glowGradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, glowSize
          );
          glowGradient.addColorStop(0, `hsla(${particle.hue}, 100%, ${particle.lightness}%, ${currentOpacity * 0.6})`);
          glowGradient.addColorStop(0.4, `hsla(${particle.hue}, 90%, ${particle.lightness - 10}%, ${currentOpacity * 0.3})`);
          glowGradient.addColorStop(1, `hsla(${particle.hue}, 80%, ${particle.lightness - 20}%, 0)`);
          
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Core particle
        const coreGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 1.5
        );
        coreGradient.addColorStop(0, `hsla(${particle.hue}, 100%, ${Math.min(particle.lightness + 20, 90)}%, ${currentOpacity})`);
        coreGradient.addColorStop(0.5, `hsla(${particle.hue}, 90%, ${particle.lightness}%, ${currentOpacity * 0.8})`);
        coreGradient.addColorStop(1, `hsla(${particle.hue}, 80%, ${particle.lightness - 10}%, 0)`);
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
    };

    const drawAmbientGlow = (
      ctx: CanvasRenderingContext2D,
      mouseX: number,
      mouseY: number,
      time: number
    ) => {
      const { width, height } = canvas;
      
      // Subtle ambient glow that shifts with mouse
      const glowX = width * 0.5 + (mouseX - width * 0.5) * 0.08;
      const glowY = height * 0.4 + (mouseY - height * 0.5) * 0.05;
      
      const ambientGlow = ctx.createRadialGradient(
        glowX, glowY, 0,
        glowX, glowY, width * 0.6
      );
      ambientGlow.addColorStop(0, `hsla(200, 100%, 50%, ${0.04 * intensityMult})`);
      ambientGlow.addColorStop(0.4, `hsla(210, 90%, 40%, ${0.02 * intensityMult})`);
      ambientGlow.addColorStop(1, 'hsla(220, 80%, 30%, 0)');
      
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);
      
      // Moving secondary glow
      const glow2X = width * 0.7 + Math.sin(time * 0.0002) * 100;
      const glow2Y = height * 0.6 + Math.cos(time * 0.00015) * 80;
      
      const glow2 = ctx.createRadialGradient(
        glow2X, glow2Y, 0,
        glow2X, glow2Y, width * 0.35
      );
      glow2.addColorStop(0, `hsla(185, 100%, 55%, ${0.03 * intensityMult})`);
      glow2.addColorStop(1, 'hsla(185, 100%, 50%, 0)');
      
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      timeRef.current += 16;
      
      // Smooth interpolation
      mouseRef.current.x = lerp(mouseRef.current.x, mouseRef.current.targetX, 0.04);
      mouseRef.current.y = lerp(mouseRef.current.y, mouseRef.current.targetY, 0.04);
      scrollRef.current.offset = lerp(scrollRef.current.offset, scrollRef.current.targetOffset, 0.08);
      scrollRef.current.velocity *= 0.95;
      
      const { width, height } = canvas;
      
      // Clear with deep charcoal/near-black base
      ctx.fillStyle = 'hsl(220, 25%, 4%)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw ambient glow first
      drawAmbientGlow(ctx, mouseRef.current.x, mouseRef.current.y, timeRef.current);
      
      // Draw flowing particles
      drawParticles(ctx, timeRef.current, mouseRef.current.x, mouseRef.current.y);
      
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    
    // Initialize mouse to center
    mouseRef.current.x = window.innerWidth / 2;
    mouseRef.current.y = window.innerHeight / 2;
    mouseRef.current.targetX = mouseRef.current.x;
    mouseRef.current.targetY = mouseRef.current.y;
    
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity, handleMouseMove, handleScroll, intensityMult]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(220 25% 4% / 0.6) 100%)',
        }}
      />
    </div>
  );
};
/**
 * RING-MASK GLASS PANEL
 *
 * Implementation: Two-layer absolute positioning
 * - RIM LAYER: Covers full area (inset-0) with enhanced glass optics
 * - BODY LAYER: Inset by 12px on all sides with heavy blur
 * - The 12px gap between them IS the visible rim ring
 *
 * Values:
 * - Rim width: 12px (uniform on all sides)
 * - Rim blur: 4px (crisp)
 * - Body blur: 22px (subtle) / 28px (stronger) - significantly defocused
 */
export const GlassPanel = ({
  children,
  className = '',
  active = false,
  glow = false,
  variant = 'subtle' // 'subtle' | 'stronger'
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  glow?: boolean;
  variant?: 'subtle' | 'stronger';
}) => {
  const isStronger = variant === 'stronger';

  // RIM WIDTH: The border ring thickness
  const rimWidth = '12px';

  // BODY BLUR: Heavy blur for defocused interior
  const bodyBlur = isStronger ? '28px' : '22px';

  return (
    <div className={`thick-glass-panel relative rounded-2xl group overflow-hidden ${className}`}>
      {/* ============================================
          RIM LAYER - Covers entire area
          This is the 12px border ring when body is inset
          ============================================ */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          // RIM GLASS OPTICS: Enhanced brightness, contrast, saturation
          backdropFilter: `blur(4px) saturate(${isStronger ? '155%' : '145%'}) brightness(${isStronger ? '118%' : '112%'}) contrast(${isStronger ? '112%' : '108%'})`,
          WebkitBackdropFilter: `blur(4px) saturate(${isStronger ? '155%' : '145%'}) brightness(${isStronger ? '118%' : '112%'}) contrast(${isStronger ? '112%' : '108%'})`,
          // Rim base color - semi-opaque
          background: `hsla(220, 25%, 10%, ${isStronger ? '0.58' : '0.52'})`,
          // Outer border highlight
          boxShadow: `
            inset 0 0 0 1px hsla(185, 100%, 72%, ${isStronger ? '0.55' : '0.45'}),
            inset 0 0 0 2px hsla(185, 100%, 82%, ${isStronger ? '0.25' : '0.18'}),
            0 8px 32px -8px hsla(220, 25%, 0%, 0.6)
          `,
        }}
      />

      {/* ANIMATED CAUSTICS - RIM (stronger light streaks on border ring) */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden animate-caustic-sweep-1"
        style={{
          background: `linear-gradient(
            115deg,
            transparent 0%,
            transparent 35%,
            hsla(185, 100%, 95%, ${isStronger ? '0.18' : '0.12'}) 48%,
            hsla(185, 100%, 92%, ${isStronger ? '0.22' : '0.15'}) 50%,
            hsla(185, 100%, 95%, ${isStronger ? '0.18' : '0.12'}) 52%,
            transparent 65%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
        }}
      />

      {/* ANIMATED CAUSTICS - RIM (secondary sweep for depth) */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden animate-caustic-sweep-2"
        style={{
          background: `linear-gradient(
            105deg,
            transparent 0%,
            transparent 40%,
            hsla(195, 100%, 90%, ${isStronger ? '0.12' : '0.08'}) 50%,
            transparent 60%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          mixBlendMode: 'screen',
          opacity: 0.6,
        }}
      />

      {/* ============================================
          BODY LAYER - Inset by 12px on all sides
          This creates the 12px gap exposing the rim
          ============================================ */}
      <div
        className="absolute rounded-xl"
        style={{
          // Inset by rim width on all sides
          top: rimWidth,
          left: rimWidth,
          right: rimWidth,
          bottom: rimWidth,
          // BODY GLASS OPTICS: Heavy blur, slight contrast reduction
          backdropFilter: `blur(${bodyBlur}) saturate(102%) contrast(${isStronger ? '86%' : '90%'})`,
          WebkitBackdropFilter: `blur(${bodyBlur}) saturate(102%) contrast(${isStronger ? '86%' : '90%'})`,
          // Body base color - lower opacity than rim
          background: `hsla(220, 25%, 5%, ${isStronger ? '0.32' : '0.26'})`,
          // Inner highlight to create crisp edge
          boxShadow: `
            inset 0 0 0 1px hsla(185, 100%, 70%, ${isStronger ? '0.20' : '0.15'}),
            inset 0 2px 4px 0 hsla(220, 25%, 0%, 0.3)
          `,
        }}
      />

      {/* ANIMATED CAUSTICS - INTERIOR (weaker light streaks inside body) */}
      <div
        className="absolute rounded-xl pointer-events-none overflow-hidden animate-caustic-sweep-1"
        style={{
          top: rimWidth,
          left: rimWidth,
          right: rimWidth,
          bottom: rimWidth,
          background: `linear-gradient(
            120deg,
            transparent 0%,
            transparent 38%,
            hsla(185, 100%, 92%, ${isStronger ? '0.10' : '0.06'}) 50%,
            transparent 62%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
          opacity: 0.8,
        }}
      />

      {/* REFRACTION DRIFT - INTERIOR (subtle moving optical bend) */}
      <div
        className="absolute rounded-xl pointer-events-none animate-refraction-drift"
        style={{
          top: rimWidth,
          left: rimWidth,
          right: rimWidth,
          bottom: rimWidth,
          background: `radial-gradient(
            ellipse at 40% 40%,
            hsla(185, 100%, 80%, 0.04) 0%,
            transparent 50%
          )`,
          mixBlendMode: 'soft-light',
        }}
      />

      {/* SPECULAR HIGHLIGHTS - INTERIOR (shimmer that follows caustics) */}
      <div
        className="absolute rounded-xl pointer-events-none overflow-hidden animate-caustic-sweep-2"
        style={{
          top: rimWidth,
          left: rimWidth,
          right: rimWidth,
          bottom: rimWidth,
          background: `linear-gradient(
            110deg,
            transparent 0%,
            transparent 42%,
            hsla(195, 100%, 95%, ${isStronger ? '0.08' : '0.05'}) 50%,
            transparent 58%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          mixBlendMode: 'screen',
          opacity: 0.5,
        }}
      />

      {/* Ultra-fine grain texture */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Optional ambient glow when active */}
      {active && glow && (
        <div
          className="absolute rounded-xl pointer-events-none transition-opacity duration-700"
          style={{
            top: rimWidth,
            left: rimWidth,
            right: rimWidth,
            bottom: rimWidth,
            background: `
              radial-gradient(
                ellipse 70% 50% at 50% 30%,
                hsla(185, 100%, 60%, ${isStronger ? '0.10' : '0.06'}) 0%,
                transparent 70%
              )
            `,
            boxShadow: `0 0 ${isStronger ? '48px' : '36px'} -10px hsla(185, 100%, 50%, ${isStronger ? '0.30' : '0.18'})`,
          }}
        />
      )}

      {/* Interactive hover state */}
      <div
        className={`
          absolute rounded-xl pointer-events-none transition-opacity duration-500
          ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}
        `}
        style={{
          top: rimWidth,
          left: rimWidth,
          right: rimWidth,
          bottom: rimWidth,
          background: `
            radial-gradient(
              ellipse at 50% 0%,
              hsla(185, 100%, 70%, ${isStronger ? '0.12' : '0.08'}) 0%,
              transparent 60%
            )
          `,
        }}
      />

      {/* CONTENT - Positioned in padded area (naturally offset by rim width) */}
      <div className="relative z-10" style={{ padding: rimWidth }}>
        {children}
      </div>
    </div>
  );
};

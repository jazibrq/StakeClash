import { useEffect, useRef } from 'react';

export const GrainOverlay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      video.style.display = 'none';
      return;
    }

    // Ensure video plays
    const playVideo = () => {
      video.play().catch(() => {
        // Silently fail if autoplay is blocked
      });
    };

    // Play on load
    video.addEventListener('canplaythrough', playVideo, { once: true });

    // Ensure seamless loop
    video.addEventListener('timeupdate', () => {
      if (video.duration - video.currentTime < 0.1) {
        video.currentTime = 0;
      }
    });

    return () => {
      video.removeEventListener('canplaythrough', playVideo);
    };
  }, []);

  return (
    <div
      className="grain-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        pointerEvents: 'none',
        opacity: 0.15,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        // @ts-ignore - webkit-playsinline for iOS Safari
        webkit-playsinline=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src="/videos/grainyvideo.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

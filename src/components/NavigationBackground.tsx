import headerStars from '@/assets/header-stars.png';

// Separate background layer for navigation that sits below the grain overlay
export const NavigationBackground = () => {
  return (
    <div
      className="fixed top-0 left-0 right-0 h-[80px] z-[3] pointer-events-none nav-image-bg"
      style={{ '--nav-bg': `url(${headerStars})` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
};

import type { ReactNode, CSSProperties } from 'react';
import { VideoBackground } from '@/components/VideoBackground';
import { GrainOverlay } from '@/components/GrainOverlay';
import { Navigation } from '@/components/Navigation';

interface PageLayoutProps {
  children: ReactNode;
  videoSrc?: string;
  forceWhiteNavText?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const PageLayout = ({
  children,
  videoSrc,
  forceWhiteNavText,
  className = 'min-h-screen',
  style,
}: PageLayoutProps) => (
  <div className={className} style={style}>
    <VideoBackground videoSrc={videoSrc} />
    <GrainOverlay />
    <Navigation forceWhiteNavText={forceWhiteNavText} />
    {children}
  </div>
);

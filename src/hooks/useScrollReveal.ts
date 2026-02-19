import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useScrollReveal = ({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
}: UseScrollRevealOptions = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
};

// Animated counter hook for metrics
export const useAnimatedCounter = (
  endValue: number,
  duration: number = 1500,
  startOnVisible: boolean = true
) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const { ref, isVisible } = useScrollReveal({ triggerOnce: true });

  useEffect(() => {
    if (startOnVisible && !isVisible) return;
    if (hasAnimated) return;

    setHasAnimated(true);
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [endValue, duration, isVisible, startOnVisible, hasAnimated]);

  return { ref, count, isVisible };
};

// Stagger children animation helper
export const useStaggerChildren = (itemCount: number, delayMs: number = 100) => {
  const { ref, isVisible } = useScrollReveal();
  
  const getDelayStyle = (index: number) => ({
    transitionDelay: isVisible ? `${index * delayMs}ms` : '0ms',
  });

  return { ref, isVisible, getDelayStyle };
};

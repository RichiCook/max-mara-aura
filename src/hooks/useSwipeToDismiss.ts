import { useState, useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 80;

export function useSwipeToDismiss(onClose: () => void, scrollRef: React.RefObject<HTMLElement | null>) {
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (el && el.scrollTop > 5) return;
    dragStart.current = e.touches[0].clientY;
  }, [scrollRef]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const delta = e.touches[0].clientY - dragStart.current;
    if (delta > 0) setDragY(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStart.current === null) return;
    if (dragY > SWIPE_THRESHOLD) onClose();
    else setDragY(0);
    dragStart.current = null;
  }, [dragY, onClose]);

  const reset = useCallback(() => {
    setDragY(0);
    dragStart.current = null;
  }, []);

  return { dragY, handleTouchStart, handleTouchMove, handleTouchEnd, reset };
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { GripVertical, LineChart, Sliders, Sparkles } from "lucide-react";

interface DraggableQuickActionProps {
  isScannerOpen: boolean;
  onToggle: () => void;
  patternCount?: number;
  activeOverlayCount?: number;
}

export const DraggableQuickAction: React.FC<DraggableQuickActionProps> = ({
  isScannerOpen,
  onToggle,
  patternCount = 0,
  activeOverlayCount = 0,
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Drag state refs to avoid state lag during high-frequency pointer moves
  const dragState = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    totalDistance: number;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    totalDistance: 0,
  });

  // Calculate default position or load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("metallurgist_quick_action_pos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x >= 0 &&
          parsed.y >= 0 &&
          parsed.x < window.innerWidth &&
          parsed.y < window.innerHeight
        ) {
          setPosition(parsed);
          return;
        }
      } catch {
        // Fall back to default
      }
    }

    // Default position: bottom-right corner with safe padding
    const defaultX = Math.max(16, window.innerWidth - 180);
    const defaultY = Math.max(80, window.innerHeight - 90);
    setPosition({ x: defaultX, y: defaultY });
  }, []);

  // Handle window resize by clamping position inside viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const btnWidth = buttonRef.current?.offsetWidth || 160;
        const btnHeight = buttonRef.current?.offsetHeight || 44;
        const maxX = Math.max(12, window.innerWidth - btnWidth - 12);
        const maxY = Math.max(56, window.innerHeight - btnHeight - 12);
        return {
          x: Math.min(Math.max(12, prev.x), maxX),
          y: Math.min(Math.max(56, prev.y), maxY),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!position || !buttonRef.current) return;

    // Capture pointer so drag events are received even if pointer moves fast
    buttonRef.current.setPointerCapture(e.pointerId);

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
      totalDistance: 0,
    };

    setIsDragging(true);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !buttonRef.current) return;

    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const dist = Math.hypot(dx, dy);
    dragState.current.totalDistance = dist;

    const btnWidth = buttonRef.current.offsetWidth || 160;
    const btnHeight = buttonRef.current.offsetHeight || 44;
    const maxX = Math.max(12, window.innerWidth - btnWidth - 12);
    const maxY = Math.max(56, window.innerHeight - btnHeight - 12);

    const nextX = Math.min(Math.max(12, dragState.current.initialPosX + dx), maxX);
    const nextY = Math.min(Math.max(56, dragState.current.initialPosY + dy), maxY);

    setPosition({ x: nextX, y: nextY });
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      buttonRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }

    // If movement was small, treat as a click/tap
    if (dragState.current.totalDistance < 7) {
      onToggle();
    } else if (position) {
      // Save position to localStorage
      try {
        localStorage.setItem("metallurgist_quick_action_pos", JSON.stringify(position));
      } catch {
        // Storage unavailable
      }
    }
  };

  if (!position) return null;

  return (
    <div
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: "none",
      }}
      className={`fixed top-0 left-0 z-50 flex items-center gap-2 px-3 py-2 rounded-full border shadow-2xl select-none backdrop-blur-md transition-shadow group ${
        isDragging
          ? "cursor-grabbing scale-105 bg-slate-900/95 border-amber-400 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/40"
          : "cursor-grab bg-slate-950/90 hover:bg-slate-900/95 border-amber-500/40 hover:border-amber-400/80 shadow-[0_8px_24px_rgba(0,0,0,0.7),0_0_12px_rgba(245,158,11,0.2)] hover:scale-102"
      }`}
      title="Drag anywhere to reposition • Tap to toggle between Chart and Scanner"
      aria-label={isScannerOpen ? "Switch to Chart view" : "Open Pattern Scanner"}
      role="button"
    >
      {/* Draggable grip indicator */}
      <div className="flex items-center text-slate-500 group-hover:text-amber-400/90 transition-colors shrink-0">
        <GripVertical size={14} />
      </div>

      {/* Action Content */}
      <div className="flex items-center gap-1.5 pointer-events-none">
        {isScannerOpen ? (
          <>
            <LineChart size={14} className="text-amber-400 shrink-0" />
            <span className="font-sans font-bold text-xs text-slate-100 tracking-tight whitespace-nowrap">
              Open Chart
            </span>
          </>
        ) : (
          <>
            <Sliders size={14} className="text-amber-400 shrink-0" />
            <span className="font-sans font-bold text-xs text-slate-100 tracking-tight whitespace-nowrap">
              Open Scanner
            </span>
            {patternCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-bold shrink-0 shadow-xs">
                {patternCount}
              </span>
            )}
          </>
        )}
      </div>

      {/* Pulse dot showing live status */}
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0 ml-0.5" />
    </div>
  );
};

export default DraggableQuickAction;

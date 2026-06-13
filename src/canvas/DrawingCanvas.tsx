import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CanvasEngine } from './CanvasEngine';

export interface DrawingCanvasHandle {
  engine: CanvasEngine | null;
}

interface DrawingCanvasProps {
  className?: string;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ className }: DrawingCanvasProps, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<CanvasEngine | null>(null);

    useImperativeHandle(ref, () => ({
      engine: engineRef.current,
    }));

    useEffect(() => {
      const el = canvasRef.current;
      if (!el || engineRef.current) return;

      const parent = el.parentElement;
      if (parent) {
        el.width = parent.clientWidth;
        el.height = parent.clientHeight;
      }

      engineRef.current = new CanvasEngine(el);

      const handleResize = () => {
        if (parent && engineRef.current) {
          engineRef.current.resize(parent.clientWidth, parent.clientHeight);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        engineRef.current?.canvas.dispose();
        engineRef.current = null;
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    );
  },
);

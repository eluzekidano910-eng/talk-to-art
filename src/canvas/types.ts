export type ShapeSize = 'small' | 'medium' | 'large';

export type ShapePosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface DrawShapeOptions {
  color?: string;
  size?: ShapeSize;
  position?: ShapePosition;
  name?: string;
  radius?: number;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

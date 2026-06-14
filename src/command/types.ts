export type FreehandAction = "start" | "stop";

export type CommandIntent =
  | 'draw'
  | 'edit'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'export'
  | 'help'
  | 'sleep'
 | 'wake'
  | 'freehand'
  | 'select';
  | 'wake'

export type ShapeType = 'circle' | 'rect' | 'triangle' | 'line';

export interface Command {
  intent: CommandIntent;
  raw: string;
  params?: Record<string, unknown>;
}

export interface NormalizedToken {
  raw: string;
  clean: string;
}

export interface ParseResult {
  commands: Command[];
  tokens: NormalizedToken[];
}

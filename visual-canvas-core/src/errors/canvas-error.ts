export type CanvasErrorCode =
  | 'INVALID_LANGUAGE'
  | 'PARSE_ERROR'
  | 'INVALID_INPUT'
  | 'INVALID_STATE'
  | 'IO_ERROR'
  | 'UNSUPPORTED_OPERATION';

export class CanvasError extends Error {
  public readonly code: CanvasErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: CanvasErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CanvasError';
    this.code = code;
    this.details = details;
  }
}


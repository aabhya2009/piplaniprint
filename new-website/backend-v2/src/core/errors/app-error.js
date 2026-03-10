export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', metadata = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }
}

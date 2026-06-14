export class PostsCreateValidationError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message);
    this.name = 'PostsCreateValidationError';
  }
}

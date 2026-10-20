// An error we throw on purpose, with an HTTP status code the client should see.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

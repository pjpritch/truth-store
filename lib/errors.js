// Copyright 2019 Peter Pritchard.  All rights reserved.

class NotFoundError extends Error {
  constructor(msg = 'Not Found') {
    super(msg);
    this.status = 404;
  }
}

class BadRequestError extends Error {
  constructor(msg = 'Bad Request') {
    super(msg);
    this.status = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(msg = 'Unauthorized') {
    super(msg);
    this.status = 401;
  }
}

class ForbiddenError extends Error {
  constructor(msg = 'Forbidden') {
    super(msg);
    this.status = 403;
  }
}

module.exports = {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
};

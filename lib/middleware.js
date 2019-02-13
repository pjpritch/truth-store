// Copyright 2019 Peter Pritchard.  All rights reserved.

const {
  globalDB,
  tenantDB,
  Tenant,
  App,
} = require('./db');

const {
  NotFoundError, UnauthorizedError, ForbiddenError
} = require('./errors');

const { X_STORE_TOKEN, X_TENANT_TOKEN } = require('./constants');

async function validateAccessToken(req, res, next) {
  try {
    const { subdomains, hostname } = req;
    req.tenantId = subdomains[subdomains.length - 1] || hostname;
    const db = globalDB();
    req.tenant = await Tenant.findOne(db, req.tenantId);
    if (req.tenant) {
      const { accessToken } = req.tenant;
      const token = req.header(X_STORE_TOKEN) || req.query.token;
      if (!token) {
        throw new UnauthorizedError();
      } else if (accessToken === token) {
        req.db = tenantDB(req.tenantId);
        return next();
      } else {
        throw new ForbiddenError();
      }
    }

    throw new UnauthorizedError();
  } catch (e) {
    return Tenant.handleAPIErrorResponse(res, e);
  }
}

async function validateTenantToken(req, res, next) {
  let { token } = req.query || {};

  if (!token) {
    token = req.header(X_TENANT_TOKEN);
  }

  if (!token) {
    Tenant.handleAPIErrorResponse(res, new UnauthorizedError());
  } else if (process.env.TENANT_TOKEN === token) {
    next();
  } else {
    Tenant.handleAPIErrorResponse(res, new ForbiddenError());
  }
}

async function attachAppContext(req, res, next) {
  try {
    const { subdomains, hostname } = req;
    req.tenantId = subdomains[subdomains.length - 1] || hostname;
    const db = globalDB();
    req.tenant = await Tenant.findOne(db, req.tenantId);
    if (!req.tenant) throw new NotFoundError();
    req.db = tenantDB(req.tenantId);
    next();
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
}

module.exports = {
  validateAccessToken,
  validateTenantToken,
  attachAppContext,
};

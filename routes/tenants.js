// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');

const { globalDB, Tenant } = require('../lib/db');
const { validateTenantToken } = require('../lib/middleware');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// middleware to enforce tenant auth token
router.all('*', validateTenantToken);

/* GET all tenants */
router.get('/', async (req, res) => {
  try {
    const db = globalDB();

    const result = await Tenant.find(db, {});
    const ids = result.data.map(col => col.id);

    Tenant.handleAPIResponse(res, {
      data: ids,
      total: result.total,
    });
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  }
});

/* GET an existing tenant */
router.get('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;

  try {
    const db = globalDB();

    const result = await Tenant.findOne(db, tenantId);
    if (!result) throw new NotFoundError();

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  }
});

// CREATE or REPLACE tenant
router.post('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { body } = req;

  try {
    const db = globalDB();

    const tenant = await Tenant.create(db, tenantId, body);

    Tenant.handleAPIResponse(res, tenant, 201);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  }
});

// UPDATE tenant
router.patch('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { body } = req;

  try {
    const db = globalDB();

    const result = await Tenant.update(db, tenantId, body);
    if (!result) throw new NotFoundError();

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  }
});

// REPLACE or UPDATE tenant
router.put('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { body } = req;

  try {
    const db = globalDB();

    const result = await Tenant.replace(db, tenantId, body);

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  }
});

// DELETE tenant
router.delete('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;

  try {
    const db = globalDB();

    const result = await Tenant.delete(db, tenantId);
    if (!result) throw new NotFoundError();

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

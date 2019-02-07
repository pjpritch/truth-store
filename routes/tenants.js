// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');

const { getClient, globalDB, Tenant } = require('../lib/db');
const { validateTenantToken } = require('../lib/middleware');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// middleware to enforce tenant auth token
router.all('*', validateTenantToken);

/* GET all tenants */
router.get('/', async (req, res) => {
  const client = getClient();

  try {
    await client.connect();
    const db = globalDB(client);

    const result = await Tenant.find(db, {});
    const ids = result.data.map(col => col.id);

    Tenant.handleAPIResponse(res, {
      data: ids,
      total: result.total,
    });
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  } finally {
    client.close();
  }
});

/* GET an existing tenant */
router.get('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const client = getClient();

  try {
    await client.connect();
    const db = globalDB(client);

    const result = await Tenant.findOne(db, tenantId);
    if (!result) throw new NotFoundError();

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  } finally {
    client.close();
  }
});

// CREATE or REPLACE tenant
router.post('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { body } = req;
  const client = getClient();

  try {
    await client.connect();
    const db = globalDB(client);

    const tenant = await Tenant.create(db, tenantId, body);

    Tenant.handleAPIResponse(res, tenant, 201);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  } finally {
    client.close();
  }
});

// UPDATE tenant
router.patch('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { body } = req;
  const client = getClient();

  try {
    await client.connect();
    const db = globalDB(client);

    const result = await Tenant.update(db, tenantId, body);
    if (!result) throw new NotFoundError();

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  } finally {
    client.close();
  }
});

// REPLACE or UPDATE tenant
router.put('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const { body } = req;
  const client = getClient();

  try {
    await client.connect();
    const db = globalDB(client);

    const result = await Tenant.replace(db, tenantId, body);

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  } finally {
    client.close();
  }
});

// DELETE tenant
router.delete('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const client = getClient();

  try {
    await client.connect();
    const db = globalDB(client);

    const result = await Tenant.delete(db, tenantId);
    if (!result) throw new NotFoundError();

    Tenant.handleAPIResponse(res, result);
  } catch (e) {
    Tenant.handleAPIErrorResponse(res, e);
  } finally {
    client.close();
  }
});

module.exports = router;

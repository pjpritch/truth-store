// Copyright 2019 Peter Pritchard.  All rights reserved.

/**
 * Webhooks: Theory of Operation
 *
 * Each webhook 'belongs' to a specific Entity.  When a new mutation occurs,
 *  we look up all webhooks of that entity, then trigger() those webhooks.
 *
 * Webhook trigger() will fire if 'method' matches spec.
 *
 * eg.
 *
 * {
 *  "entityId": "products",
 *  "methods": "*",         // <-- or comma-separated 'create,update,replace,delete'
 *  "url": "http://fred.127.0.0.1.nip.io:3000/objects/v1/events",
 * }
 */
const express = require('express');
const { Webhook } = require('../lib/db');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// list all webhooks, paginated and basic query capabilities
router.get('/', async (req, res) => {
  const { db } = req;
  const { start, count } = req.query;

  try {
    const result = await Webhook.find(db, { start, count });
    const ids = result.data.map(webhook => webhook.id);

    Webhook.handleAPIResponse(res, {
      data: ids,
      total: result.total,
    });
  } catch (e) {
    Webhook.handleAPIErrorResponse(res, e);
  }
});

// get an existing webhook
router.get('/:webhookId', async (req, res) => {
  const { db } = req;
  const { webhookId } = req.params;

  try {
    const result = await Webhook.findOne(db, webhookId);
    if (!result) throw new NotFoundError();

    Webhook.handleAPIResponse(res, result);
  } catch (e) {
    Webhook.handleAPIErrorResponse(res, e);
  }
});

// create a new webhook
router.post('/:webhookId', async (req, res) => {
  const { db, body } = req;
  const { webhookId } = req.params;

  try {
    const result = await Webhook.create(db, webhookId, body);

    Webhook.handleAPIResponse(res, result, 201);
  } catch (e) {
    Webhook.handleAPIErrorResponse(res, e);
  }
});

// replace an existing webhook
router.put('/:webhookId', async (req, res) => {
  const { db, body } = req;
  const { webhookId } = req.params;

  try {
    const result = await Webhook.replace(db, webhookId, body);

    Webhook.handleAPIResponse(res, result);
  } catch (e) {
    Webhook.handleAPIErrorResponse(res, e);
  }
});

// update an existing webhook
router.patch('/:webhookId', async (req, res) => {
  const { db, body } = req;
  const { webhookId } = req.params;

  try {
    const result = await Webhook.update(db, webhookId, body);
    if (!result) throw new NotFoundError();

    Webhook.handleAPIResponse(res, result);
  } catch (e) {
    Webhook.handleAPIErrorResponse(res, e);
  }
});

// delete an existing webhook
router.delete('/:webhookId', async (req, res) => {
  const { db } = req;
  const { webhookId } = req.params;

  try {
    const result = await Webhook.delete(db, webhookId);
    if (!result) throw new NotFoundError();

    Webhook.handleAPIResponse(res, result);
  } catch (e) {
    Webhook.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

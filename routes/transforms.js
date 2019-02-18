// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const {
  Context,
  Instance,
  Transform,
} = require('../lib/db');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// list all transforms, paginated and basic query capabilities
router.get('/', async (req, res) => {
  const { db } = req;
  const { start, count } = req.query;

  try {
    const result = await Transform.find(db, { start, count });
    const ids = result.data.map(transform => transform.id);

    Transform.handleAPIResponse(res, {
      data: ids,
      total: result.total,
    });
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

// get an existing transform
router.get('/:transformId', async (req, res) => {
  const { db } = req;
  const { transformId } = req.params;

  try {
    const result = await Transform.findOne(db, transformId);
    if (!result) throw new NotFoundError();

    Transform.handleAPIResponse(res, result);
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

// get an existing transform
router.get('/:transformId/render/:entityId/:instanceId', async (req, res) => {
  const { db, query } = req;
  const {
    entityId,
    instanceId,
    transformId,
  } = req.params;

  try {
    const transform = await Transform.findOne(db, transformId);
    let instance;
    if (entityId === 'contexts') {
      const context = await Context.findOne(db, instanceId);
      instance = await Context.resolveContext(db, context, query);
    } else {
      instance = await Instance.findOne(db, entityId, instanceId);
    }
    if (!transform || !instance) throw new NotFoundError();

    const result = Transform.render(transform, instance);
    Transform.handleAPIResponse(res, result);
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

// create a new transform
router.post('/:transformId', async (req, res) => {
  const { db, body } = req;
  const { transformId } = req.params;

  try {
    const result = await Transform.create(db, transformId, body);

    Transform.handleAPIResponse(res, result, 201);
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

// replace an existing transform
router.put('/:transformId', async (req, res) => {
  const { db, body } = req;
  const { transformId } = req.params;

  try {
    const result = await Transform.replace(db, transformId, body);

    Transform.handleAPIResponse(res, result);
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

// update an existing transform
router.patch('/:transformId', async (req, res) => {
  const { db, body } = req;
  const { transformId } = req.params;

  try {
    const result = await Transform.update(db, transformId, body);
    if (!result) throw new NotFoundError();

    Transform.handleAPIResponse(res, result);
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

// delete an existing transform
router.delete('/:transformId', async (req, res) => {
  const { db } = req;
  const { transformId } = req.params;

  try {
    const result = await Transform.delete(db, transformId);
    if (!result) throw new NotFoundError();

    Transform.handleAPIResponse(res, result);
  } catch (e) {
    Transform.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

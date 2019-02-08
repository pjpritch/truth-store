// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const { Instance, Entity } = require('../lib/db');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

router.param('entityId', async (req, res, next) => {
  req.entityId = req.params.entityId;
  req.entity = await Entity.findOne(req.db, req.entityId);

  if (req.entity) {
    next();
  } else {
    Entity.handleAPIErrorResponse(res, new NotFoundError());
  }
});

// list all instances, paginated and basic query capabilities
router.get('/:entityId', async (req, res) => {
  const { db } = req;
  const { entityId } = req.params;
  const { start, count } = req.query;

  try {
    const result = await Instance.find(db, entityId, { start, count });

    Instance.handleAPIResponse(res, entityId, result);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// get an existing instance
router.get('/:entityId/:instanceId', async (req, res) => {
  const { db } = req;
  const { instanceId, entityId } = req.params;

  try {
    const result = await Instance.findOne(db, entityId, instanceId);
    if (!result) throw new NotFoundError();

    Instance.handleAPIResponse(res, entityId, result);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// create a new instance
router.post('/:entityId/:instanceId', async (req, res) => {
  const { db, body } = req;
  const { instanceId, entityId } = req.params;

  try {
    const result = await Instance.create(db, entityId, instanceId, body);

    Instance.handleAPIResponse(res, entityId, result, 201);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// replace an existing instance
router.put('/:entityId/:instanceId', async (req, res) => {
  const { db, body } = req;
  const { instanceId, entityId } = req.params;

  try {
    const result = await Instance.replace(db, entityId, instanceId, body);

    Instance.handleAPIResponse(res, entityId, result);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// update an existing instance
router.patch('/:entityId/:instanceId', async (req, res) => {
  const { db, body } = req;
  const { instanceId, entityId } = req.params;

  try {
    const result = await Instance.update(db, entityId, instanceId, body);

    Instance.handleAPIResponse(res, entityId, result);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// delete an existing instance
router.delete('/:entityId/:instanceId', async (req, res) => {
  const { db } = req;
  const { instanceId, entityId } = req.params;

  try {
    const result = await Instance.delete(db, entityId, instanceId);
    if (!result) throw new NotFoundError();

    Instance.handleAPIResponse(res, entityId, result);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

module.exports = router;

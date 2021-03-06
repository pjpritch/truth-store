// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const { Entity } = require('../lib/db');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// list all entities
router.get('/', async (req, res) => {
  const { db } = req;

  try {
    const result = await Entity.find(db, {});

    Entity.handleAPIResponse(res, result);
  } catch (e) {
    Entity.handleAPIErrorResponse(res, e);
  }
});

// get an existing entity
router.get('/:entityId', async (req, res) => {
  const { db } = req;
  const { entityId } = req.params;

  try {
    const entity = await Entity.findOne(db, entityId);
    if (!entity) throw new NotFoundError();

    Entity.handleAPIResponse(res, entity);
  } catch (e) {
    Entity.handleAPIErrorResponse(res, e);
  }
});

// create new entity
router.post('/:entityId', async (req, res) => {
  const { db, body } = req;
  const { entityId } = req.params;

  try {
    const result = await Entity.create(db, entityId, body);

    Entity.handleAPIResponse(res, result, 201);
  } catch (e) {
    Entity.handleAPIErrorResponse(res, e);
  }
});

// replace an existing entity
router.put('/:entityId', async (req, res) => {
  const { db, body } = req;
  const { entityId } = req.params;

  try {
    const result = await Entity.replace(db, entityId, body);

    Entity.handleAPIResponse(res, result);
  } catch (e) {
    Entity.handleAPIErrorResponse(res, e);
  }
});

// update an existing entity
router.patch('/:entityId', async (req, res) => {
  const { db, body } = req;
  const { entityId } = req.params;

  try {
    const result = await Entity.update(db, entityId, body);
    if (!result) throw new NotFoundError();

    Entity.handleAPIResponse(res, result);
  } catch (e) {
    Entity.handleAPIErrorResponse(res, e);
  }
});

// delete an existing entity
router.delete('/:entityId', async (req, res) => {
  const { db } = req;
  const { entityId } = req.params;

  try {
    const result = await Entity.delete(db, entityId);
    if (!result) throw new NotFoundError();

    Entity.handleAPIResponse(res, result);
  } catch (e) {
    Entity.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

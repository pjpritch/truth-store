// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const { Context } = require('../lib/db');
const { NotFoundError, BadRequestError } = require('../lib/errors');

const router = express.Router();

// list all contexts, paginated and basic query capabilities
router.get('/', async (req, res) => {
  const { db } = req;
  const { start, count } = req.query;

  try {
    const result = await Context.find(db, { start, count });
    const ids = result.data.map(context => context.id);

    Context.handleAPIResponse(res, {
      data: ids,
      total: result.total,
    });
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

// get an existing context
router.get('/:contextId', async (req, res) => {
  const { db } = req;
  const { contextId } = req.params;

  try {
    const result = await Context.findOne(db, contextId);
    if (!result) throw new NotFoundError();

    Context.handleAPIResponse(res, result);
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

// render an existing instance
router.get('/:contextId/render', async (req, res) => {
  const { db, query } = req;
  const { contextId } = req.params;

  try {
    const result = await Context.findOne(db, contextId);
    if (!result) throw new NotFoundError();

    const instance = await Context.resolveContext(db, result, query);
    if (!instance) throw new BadRequestError();

    Context.handleAPIResponse(res, instance);
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

// create a new context
router.post('/:contextId', async (req, res) => {
  const { db, body } = req;
  const { contextId } = req.params;

  try {
    const result = await Context.create(db, contextId, body);

    Context.handleAPIResponse(res, result, 201);
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

// replace an existing context
router.put('/:contextId', async (req, res) => {
  const { db, body } = req;
  const { contextId } = req.params;

  try {
    const result = await Context.replace(db, contextId, body);

    Context.handleAPIResponse(res, result);
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

// update an existing context
router.patch('/:contextId', async (req, res) => {
  const { db, body } = req;
  const { contextId } = req.params;

  try {
    const result = await Context.update(db, contextId, body);
    if (!result) throw new NotFoundError();

    Context.handleAPIResponse(res, result);
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

// delete an existing context
router.delete('/:contextId', async (req, res) => {
  const { db } = req;
  const { contextId } = req.params;

  try {
    const result = await Context.delete(db, contextId);
    if (!result) throw new NotFoundError();

    Context.handleAPIResponse(res, result);
  } catch (e) {
    Context.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

// Copyright 2019 Peter Pritchard.  All rights reserved.

const { isArray } = require('util');
const express = require('express');
const { Instance, Entity } = require('../lib/db');
const { NotFoundError } = require('../lib/errors');
const search = require('../lib/search');

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
router.get('/search', async (req, res) => {
  const { db } = req;
  const { databaseName } = db;
  const { q } = req.query;

  try {
    const result = await search.searchAll(databaseName, q);
    const { hits, total } = result.hits;

    // eslint-disable-next-line
    const data = hits.map(hit => ({ _entity:hit._type, ...hit._source }));

    Instance.handleAPIResponse(res, 'search', { _query: q, data, total });
  } catch (e) {
    Instance.handleAPIErrorResponse(res, 'search', e);
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

// list all instances, paginated and basic query capabilities
router.get('/:entityId/search', async (req, res) => {
  const { db } = req;
  const { databaseName } = db;
  const { entityId } = req.params;
  const { q } = req.query;

  try {
    const result = await search.search(databaseName, entityId, q);
    const { hits, total } = result.hits;

    // eslint-disable-next-line no-underscore-dangle
    const data = hits.map(hit => hit._source);

    Instance.handleAPIResponse(res, entityId, { _query: q, data, total });
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// get an existing instance
router.get('/:entityId/:instanceId', async (req, res) => {
  const { db } = req;
  const { instanceId, entityId } = req.params;

  try {
    let result = await Instance.findOne(db, entityId, instanceId);
    if (!result) throw new NotFoundError();

    if (isArray(result)) {
      result = {
        data: result,
        total: result.length,
      };
    }

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

// create a new instance(s)
router.post('/:entityId', async (req, res) => {
  const { db, body } = req;
  const { entityId } = req.params;
  const isArrayBody = isArray(body);

  const instances = isArrayBody ? body : [body];

  try {
    const result = await Promise.all(instances
      .map(instance => Instance.create(db, entityId, instance.id, instance)));

    const response = isArrayBody ? { data: result, total: result.length } : result[0];

    Instance.handleAPIResponse(res, entityId, response, 201);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityId, e);
  }
});

// create a new instance(s)
router.post('/', async (req, res) => {
  const { db, body } = req;

  const entityIds = Object.keys(body);

  try {
    const result = await Promise.all(entityIds.map((entityId) => {
      const instances = body[entityId];
      return Promise.all(instances
        .map(instance => Instance.create(db, entityId, instance.id, instance)));
    }));
    const resultMap = {};
    entityIds.forEach((entityId, i) => {
      resultMap[entityId] = result[i];
    });
    Instance.handleAPIResponse(res, entityIds.join(','), { data: resultMap }, 201);
  } catch (e) {
    Instance.handleAPIErrorResponse(res, entityIds.join(','), e);
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

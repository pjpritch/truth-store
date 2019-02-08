// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const { Template, Context, Instance } = require('../lib/db');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// list all templates, paginated and basic query capabilities
router.get('/', async (req, res) => {
  const { db } = req;
  const { start, count } = req.query;

  try {
    const result = await Template.find(db, { start, count });
    const ids = result.data.map(template => template.id);

    Template.handleAPIResponse(res, {
      data: ids,
      total: result.total,
    });
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

// render an existing instance of context with a template
router.get('/:templateId/render/:entityId/:instanceId', async (req, res) => {
  const { templateId, entityId, instanceId } = req.params;
  const { query, db } = req;

  try {
    const template = await Template.findOne(db, templateId);
    let instance;
    if (entityId === 'contexts') {
      const context = await Context.findOne(db, instanceId);
      instance = await Context.resolveContext(db, context, query);
    } else {
      instance = await Instance.findOne(db, entityId, instanceId);
    }

    const rendering = Template.render(template, instance);

    res.setHeader('Content-Type', template.contentType || 'application/json');
    res.send(rendering);
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

// get an existing template
router.get('/:templateId', async (req, res) => {
  const { db } = req;
  const { templateId } = req.params;

  try {
    const result = await Template.findOne(db, templateId);
    if (!result) throw new NotFoundError();

    Template.handleAPIResponse(res, result);
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

// create a new template
router.post('/:templateId', async (req, res) => {
  const { db, body } = req;
  const { templateId } = req.params;

  try {
    const result = await Template.create(db, templateId, body);

    Template.handleAPIResponse(res, result, 201);
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

// replace an existing template
router.put('/:templateId', async (req, res) => {
  const { db, body } = req;
  const { templateId } = req.params;

  try {
    const result = await Template.replace(db, templateId, body);

    Template.handleAPIResponse(res, result);
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

// update an existing template
router.patch('/:templateId', async (req, res) => {
  const { db, body } = req;
  const { templateId } = req.params;

  try {
    const result = await Template.update(db, templateId, body);
    if (!result) throw new NotFoundError();

    Template.handleAPIResponse(res, result);
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

// delete an existing template
router.delete('/:templateId', async (req, res) => {
  const { db } = req;
  const { templateId } = req.params;

  try {
    const result = await Template.delete(db, templateId);
    if (!result) throw new NotFoundError();

    Template.handleAPIResponse(res, result);
  } catch (e) {
    Template.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const { App } = require('../lib/db');
const { NotFoundError } = require('../lib/errors');

const router = express.Router();

// list all apps
router.get('/', async (req, res) => {
  const { db } = req;

  try {
    const result = await App.find(db, {});

    App.handleAPIResponse(res, result);
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
});

// get an existing app
router.get('/:appId', async (req, res) => {
  const { db } = req;
  const { appId } = req.params;

  try {
    const app = await App.findOne(db, appId);
    if (!app) throw new NotFoundError();

    App.handleAPIResponse(res, app);
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
});

// create new app
router.post('/:appId', async (req, res) => {
  const { db, body } = req;
  const { appId } = req.params;

  try {
    const result = await App.create(db, appId, body);

    App.handleAPIResponse(res, result, 201);
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
});

// replace an existing app
router.put('/:appId', async (req, res) => {
  const { db, body } = req;
  const { appId } = req.params;

  try {
    const result = await App.replace(db, appId, body);

    App.handleAPIResponse(res, result);
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
});

// update an existing app
router.patch('/:appId', async (req, res) => {
  const { db, body } = req;
  const { appId } = req.params;

  try {
    const result = await App.update(db, appId, body);
    if (!result) throw new NotFoundError();

    App.handleAPIResponse(res, result);
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
});

// delete an existing app
router.delete('/:appId', async (req, res) => {
  const { db } = req;
  const { appId } = req.params;

  try {
    const result = await App.delete(db, appId);
    if (!result) throw new NotFoundError();

    App.handleAPIResponse(res, result);
  } catch (e) {
    App.handleAPIErrorResponse(res, e);
  }
});

module.exports = router;

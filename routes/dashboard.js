const express = require('express');

const {
  Context,
  Entity,
  Template,
  App,
} = require('../lib/db');

const router = express.Router();

router.get('/contexts/:contextId', async (req, res) => {
  const { contextId } = req.params;
  const context = await Context.findOne(req.db, contextId);
  res.render('context', { context, layout: 'application', title: 'Context' });
});

router.post('/contexts/:contextId/save', async (req, res) => {
  const { contextId } = req.params;

  try {
    const { body } = req;
    const { content } = body;
    const doc = JSON.parse(content);
    await Context.replace(req.db, contextId, doc);
  } catch (e) {
    console.error(e.stack);
  } finally {
    res.redirect(`../${contextId}`);
  }
});

router.get('/entities/:entityId', async (req, res) => {
  const { entityId } = req.params;
  const entity = await Entity.findOne(req.db, entityId);
  res.render('entity', { entity, layout: 'application', title: 'Entity' });
});

router.post('/entities/:entityId/save', async (req, res) => {
  const { entityId } = req.params;

  try {
    const { body } = req;
    const { content } = body;
    const doc = JSON.parse(content);
    await Entity.replace(req.db, entityId, doc);
  } catch (e) {
    console.error(e.stack);
  } finally {
    res.redirect(`../${entityId}`);
  }
});

router.get('/templates/:templateId', async (req, res) => {
  const { templateId } = req.params;
  const template = await Template.findOne(req.db, templateId);
  res.render('template', { template, layout: 'application', title: 'Template' });
});

router.post('/templates/:templateId/save', async (req, res) => {
  const { templateId } = req.params;

  try {
    const { body } = req;
    const { content } = body;
    const doc = { content };
    await Template.update(req.db, templateId, doc);
  } catch (e) {
    console.error(e.stack);
  } finally {
    res.redirect(`../${templateId}`);
  }
});

router.get('/apps/:appId', async (req, res) => {
  const { appId } = req.params;
  const app = await App.findOne(req.db, appId);
  res.render('app', { app, layout: 'application', title: 'App' });
});

router.post('/apps/:appId/save', async (req, res) => {
  const { appId } = req.params;

  try {
    const { body } = req;
    const { content } = body;
    const doc = JSON.parse(content);
    await App.replace(req.db, appId, doc);
  } catch (e) {
    console.error(e.stack);
  } finally {
    res.redirect(`../${appId}`);
  }
});

module.exports = router;

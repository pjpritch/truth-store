
const express = require('express');
const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();
const {
  App,
  Context,
  Template,
} = require('../lib/db');
const { attachAppContext } = require('../lib/middleware');
const { NotFoundError, BadRequestError } = require('../lib/errors');
const { assign } = require('lodash');

const router = express.Router();

router.get('*', attachAppContext, async (req, res) => {
  try {
    const app = await App.findOne(req.db, req.tenant.defaultAppId);
    const route = App.matchedRoute(req, app);
    if (!route) throw new NotFoundError();

    const {
      contextId,
      templateId,
      layoutId,
      query,
      params,
    } = route;

    const context = await Context.findOne(req.db, contextId);
    const template = await Template.findOne(req.db, templateId);
    const layout = await Template.findOne(req.db, layoutId);

    const ctxQuery = assign({}, query, params, req.query);
    const data = await Context.resolveContext(req.db, context, ctxQuery);

    const vue = new Vue({
      data,
      template: template.content,
    });

    const html = await renderer.renderToString(vue);
    if (!html) throw new BadRequestError();

    const page = Template.render(layout, { body: html });

    res.setHeader('content-type', layout.contentType);
    res.send(page);
  } catch (e) {
    res.send(e.stack);
  }
});

module.exports = router;

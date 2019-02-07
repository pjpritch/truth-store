// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../app');
const request = require('supertest')(app);

describe('app.js', () => {
  context('Express error handler', () => {
    it('should return a 404 page', async () => {
      const { text } = await request.get('/something/not/found')
        .expect('Content-type', /html/)
        .expect(404);

      assert.ok(text);
    });
  });
});

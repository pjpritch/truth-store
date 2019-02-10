// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');

const {
  TENANT_API_VERSION,
  TENANT_COLLECTION_NAME,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'non-existent-tenant';
const TEST_DOMAIN = '.127.0.0.1.nip.io';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('lib/middleware.js', function test() {
  this.timeout(10000);

  let server;

  before(async () => {
    server = await app.listen(PORT);
  });

  after(async () => {
    server.close();
  });

  context('GET /tenants/v1', () => {
    it('should fail with bogus tenant', async () => {
      const { body } = await request.get('/tenants/v1')
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TENANT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TENANT_COLLECTION_NAME);
      assert.equal(body.error, 'Unauthorized');
    });
  });
});

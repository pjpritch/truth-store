// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');
const {
  globalDB,
  tenantDB,
  Tenant,
} = require('../../lib/db');

const {
  WEBHOOK_API_VERSION,
  WEBHOOK_COLLECTION_NAME,
  X_STORE_TOKEN,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'test-tenant';
const TEST_DOMAIN = '.127.0.0.1.nip.io';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('/webhooks/v1 API', function test() {
  this.timeout(10000);

  let server;
  let token;
  let db;
  before(async () => {
    db = globalDB();
    const tenant = await Tenant.create(db, TENANT_ID, {});
    token = tenant.accessToken;
    db = tenantDB(TENANT_ID);
    server = await app.listen(PORT);
  });
  after(async () => {
    server.close();
    db = globalDB();
    await Tenant.delete(db, TENANT_ID);
  });

  context('GET /webhooks/v1', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/webhooks/v1')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 w/ bad auth token', async () => {
      const { body } = await request.get('/webhooks/v1?token=velma')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/webhooks/v1?token=${token}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/webhooks/v1')
        .expect('Content-Type', /json/)
        .set(X_STORE_TOKEN, token)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.ok(body.data);
    });
  });

  context('POST /webhooks/v1/:webhookId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/webhooks/v1/schema2')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new web hook', async () => {
      const { body } = await request.post('/webhooks/v1/schema2')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /webhooks/v1/:webhookId', () => {
    it('should get existing Webhook', async () => {
      const { body } = await request.get('/webhooks/v1/schema2')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
    });

    it('should NOT get non-existing webhook', async () => {
      const { body } = await request.get('/webhooks/v1/joseph')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /webhooks/v1/:webhookId', () => {
    it('should UPDATE an existing Webhook', async () => {
      const { body } = await request.patch('/webhooks/v1/schema2')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Webhook', async () => {
      const { body } = await request.patch('/webhooks/v1/gerald')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /webhooks/v1/:webhookId', () => {
    it('should REPLACE an existing Webhook', async () => {
      const { body } = await request.put('/webhooks/v1/schema2')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /webhooks/v1/:webhookId', () => {
    it('should DELETE an existing Webhook', async () => {
      const { body } = await request.delete('/webhooks/v1/schema2')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, WEBHOOK_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, WEBHOOK_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
    });

    it('should NOT DELETE a non-existing Webhook', async () => {
      const { body } = await request.delete('/webhooks/v1/schema2')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });
});

// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');
const {
  getClient,
  globalDB,
  tenantDB,
  Tenant,
} = require('../../lib/db');

const {
  ENTITY_API_VERSION,
  ENTITY_COLLECTION_NAME,
  X_STORE_TOKEN,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'test-tenant';
const TEST_DOMAIN = '.domain.local';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('/entities/v1 API', function test() {
  this.timeout(10000);

  const client = getClient();
  let server;
  let token;
  let db;
  before(async () => {
    await client.connect();
    db = globalDB(client);
    const tenant = await Tenant.create(db, TENANT_ID, {});
    token = tenant.accessToken;
    db = tenantDB(client, TENANT_ID);
    server = await app.listen(PORT);
  });
  after(async () => {
    server.close();
    db = globalDB(client);
    await Tenant.delete(db, TENANT_ID);
    client.close();
  });

  context('GET /entities/v1', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/entities/v1')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 w/ bad auth token', async () => {
      const { body } = await request.get('/entities/v1?token=thetisfortraps')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/entities/v1?token=${token}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/entities/v1')
        .expect('Content-Type', /json/)
        .set(X_STORE_TOKEN, token)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.ok(body.data);
    });
  });

  context('POST /entities/v1/:entityId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/entities/v1/products')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new entity', async () => {
      const { body } = await request.post('/entities/v1/products')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.equal(body.id, 'products');
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /entities/v1/:entityId', () => {
    it('should get existing Entity', async () => {
      const { body } = await request.get('/entities/v1/products')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.equal(body.id, 'products');
    });

    it('should NOT get non-existing entity', async () => {
      const { body } = await request.get('/entities/v1/joseph')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /entities/v1/:entityId', () => {
    it('should UPDATE an existing Entity', async () => {
      const { body } = await request.patch('/entities/v1/products')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.equal(body.id, 'products');
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Entity', async () => {
      const { body } = await request.patch('/entities/v1/gerald')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /entities/v1/:entityId', () => {
    it('should REPLACE an existing Entity', async () => {
      const { body } = await request.put('/entities/v1/products')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.equal(body.id, 'products');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /entities/v1/:entityId', () => {
    it('should DELETE an existing Entity', async () => {
      const { body } = await request.delete('/entities/v1/products')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, ENTITY_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, ENTITY_COLLECTION_NAME);
      assert.equal(body.id, 'products');
    });

    it('should NOT DELETE a non-existing Tenant', async () => {
      const { body } = await request.delete('/entities/v1/products')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });
});

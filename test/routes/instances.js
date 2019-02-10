// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');
const {
  globalDB,
  tenantDB,
  Entity,
  Tenant,
} = require('../../lib/db');

const {
  INSTANCE_API_VERSION,
  X_STORE_TOKEN,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'test-tenant';
const TEST_DOMAIN = '.127.0.0.1.nip.io';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('/objects/v1 API', function test() {
  this.timeout(10000);

  let server;
  let token;
  let db;
  before(async () => {
    db = globalDB();
    const tenant = await Tenant.create(db, TENANT_ID, {});
    db = tenantDB(TENANT_ID);
    await Entity.create(db, 'products', {});
    token = tenant.accessToken;
    server = await app.listen(PORT);
  });
  after(async () => {
    server.close();
    await Entity.delete(db, 'products');
    db = globalDB();
    await Tenant.delete(db, TENANT_ID);
  });

  context('GET /objects/v1/products', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/objects/v1/products')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 w/ bad auth token', async () => {
      const { body } = await request.get('/objects/v1/products?token=fredtjones')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/objects/v1/products?token=${token}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/objects/v1/products')
        .expect('Content-Type', /json/)
        .set(X_STORE_TOKEN, token)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.ok(body.data);
    });
  });

  context('POST /objects/v1/:entityId/:instanceId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/objects/v1/products/product-123')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new entity', async () => {
      const { body } = await request.post('/objects/v1/products/product-123')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.equal(body.id, 'product-123');
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /objects/v1/:entityId/:instanceId', () => {
    it('should get existing Instance', async () => {
      const { body } = await request.get('/objects/v1/products/product-123')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.equal(body.id, 'product-123');
    });

    it('should NOT get non-existing entity', async () => {
      const { body } = await request.get('/objects/v1/products/joseph')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /objects/v1/:entityId/:instanceId', () => {
    it('should UPDATE an existing Instance', async () => {
      const { body } = await request.patch('/objects/v1/products/product-123')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.equal(body.id, 'product-123');
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Instance', async () => {
      const { body } = await request.patch('/objects/v1/gerald/jones')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /objects/v1/:entityId/:instanceId', () => {
    it('should REPLACE an existing Instance', async () => {
      const { body } = await request.put('/objects/v1/products/product-123')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.equal(body.id, 'product-123');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /objects/v1/:entityId/:instanceId', () => {
    it('should DELETE an existing Instance', async () => {
      const { body } = await request.delete('/objects/v1/products/product-123')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, INSTANCE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'products');
      assert.equal(body.id, 'product-123');
    });

    it('should NOT DELETE a non-existing Instance', async () => {
      const { body } = await request.delete('/objects/v1/products/product-123')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });
});

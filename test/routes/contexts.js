// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');
const {
  globalDB,
  tenantDB,
  Instance,
  Entity,
  Context,
  Tenant,
} = require('../../lib/db');

const {
  CONTEXT_API_VERSION,
  CONTEXT_COLLECTION_NAME,
  X_STORE_TOKEN,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'test-tenant';
const TEST_DOMAIN = '.127.0.0.1.nip.io';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('/contexts/v1 API', function test() {
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

  context('GET /contexts/v1', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/contexts/v1')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 w/ bad auth token', async () => {
      const { body } = await request.get('/contexts/v1?token=thetisfortraps')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/contexts/v1?token=${token}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/contexts/v1')
        .set(X_STORE_TOKEN, token)
        .expect('Content-Type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.ok(body.data);
    });
  });

  context('POST /contexts/v1/:contextId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/contexts/v1/product-detail')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new context', async () => {
      const { body } = await request.post('/contexts/v1/product-detail')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.id, 'product-detail');
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /contexts/v1/:contextId', () => {
    it('should get existing context', async () => {
      const { body } = await request.get('/contexts/v1/product-detail')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.id, 'product-detail');
    });

    it('should NOT get non-existing entity', async () => {
      const { body } = await request.get('/contexts/v1/joseph')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /contexts/v1/:contextId', () => {
    it('should UPDATE an existing Context', async () => {
      const { body } = await request.patch('/contexts/v1/product-detail')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.id, 'product-detail');
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Context', async () => {
      const { body } = await request.patch('/contexts/v1/gerald')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /contexts/v1/:contextId', () => {
    it('should REPLACE an existing Context', async () => {
      const { body } = await request.put('/contexts/v1/product-detail')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.id, 'product-detail');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /contexts/v1/:contextId', () => {
    it('should DELETE an existing Context', async () => {
      const { body } = await request.delete('/contexts/v1/product-detail')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.id, 'product-detail');
    });

    it('should NOT DELETE a non-existing Context', async () => {
      const { body } = await request.delete('/contexts/v1/product-detail')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });

  context('GET /contexts/v1/:contextId/render', () => {
    let product,
      product2,
      product3;

    before(async () => {
      await Entity.create(db, 'products', {});
      product = await Instance.create(db, 'products', 'product-124', {
        name: 'Product 124',
        relatedId: 'product-126'
      });
      product2 = await Instance.create(db, 'products', 'product-125', {
        name: 'Product 125',
        relatedId: 'product-126'
      });
      product3 = await Instance.create(db, 'products', 'product-126', {
        name: 'Product 126',
        relatedId: 'product-124'
      });
      await Context.create(db, 'product-detail', {
        bindings: {
          product: {
            entity: 'products',
            param: 'pid',
            required: true,
          },
          upsellProduct: {
            entity: 'products',
            param: 'upid',
            defaultValue: 'product.relatedId'
          },
        },
      });
    });

    it('should NOT return a dynamic context', async () => {
      const { body } = await request.get('/contexts/v1/product-detail/render')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(400);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.ok(body.error);
    });

    it('should return a dynamic context', async () => {
      const { body } = await request.get('/contexts/v1/product-detail/render?pid=product-124&upid=product-125')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.product.name, product.name);
      assert.equal(body.upsellProduct.name, product2.name);
    });

    it('should return a dynamic context with default derived values', async () => {
      const { body } = await request.get('/contexts/v1/product-detail/render?pid=product-124')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.product.name, product.name);
      assert.equal(body.upsellProduct.name, product3.name);
    });

    it('should return a dynamic context with query derived values', async () => {
      const { body } = await request.get('/contexts/v1/product-detail/render?pid=product-124&upid=product.relatedId')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, CONTEXT_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, CONTEXT_COLLECTION_NAME);
      assert.equal(body.product.name, product.name);
      assert.equal(body.upsellProduct.name, product3.name);
    });
  });
});

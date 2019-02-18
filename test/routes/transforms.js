// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');
const {
  globalDB,
  tenantDB,
  Tenant,
  Transform,
} = require('../../lib/db');

const {
  TRANSFORM_API_VERSION,
  TRANSFORM_COLLECTION_NAME,
  X_STORE_TOKEN,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'test-tenant';
const TEST_DOMAIN = '.127.0.0.1.nip.io';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('/transforms/v1 API', function test() {
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

  context('GET /transforms/v1', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/transforms/v1')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 w/ bad auth token', async () => {
      const { body } = await request.get('/transforms/v1?token=velma')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/transforms/v1?token=${token}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/transforms/v1')
        .expect('Content-Type', /json/)
        .set(X_STORE_TOKEN, token)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.ok(body.data);
    });
  });

  context('POST /transforms/v1/:transformId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/transforms/v1/schema2')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new Transform', async () => {
      const { body } = await request.post('/transforms/v1/schema2')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /transforms/v1/:transformId', () => {
    it('should get existing Transform', async () => {
      const { body } = await request.get('/transforms/v1/schema2')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
    });

    it('should NOT get non-existing entity', async () => {
      const { body } = await request.get('/transforms/v1/joseph')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /transforms/v1/:transformId', () => {
    it('should UPDATE an existing Transform', async () => {
      const { body } = await request.patch('/transforms/v1/schema2')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Transform', async () => {
      const { body } = await request.patch('/transforms/v1/gerald')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /transforms/v1/:transformId', () => {
    it('should REPLACE an existing Transform', async () => {
      const { body } = await request.put('/transforms/v1/schema2')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /transforms/v1/:transformId', () => {
    it('should DELETE an existing Transform', async () => {
      const { body } = await request.delete('/transforms/v1/schema2')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TRANSFORM_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TRANSFORM_COLLECTION_NAME);
      assert.equal(body.id, 'schema2');
    });

    it('should NOT DELETE a non-existing Transform', async () => {
      const { body } = await request.delete('/transforms/v1/schema2')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });

  context('GET /transforms/v1/:transformId/render/:entityId/:instanceId', () => {
    before(async () => {
      // create product
      // create transform
    });

    it('should render a transformed document with simple keys', async () => {
      const product = {
        id: 'product-123',
        name: 'Product 123',
        category_id: 'main-category',
      };

      const simpleKeyTransform = {
        productId: 'id',
        displayName: 'name',
        categoryId: 'category_id',
      };

      const result = Transform.render(simpleKeyTransform, product);

      assert.deepEqual(result, {
        productId: 'product-123',
        displayName: 'Product 123',
        categoryId: 'main-category',
      });
    });

    it('should render a transformed document with key paths', async () => {
      const product = {
        something: { id: 'product-123' },
        else: { name: 'Product 123' },
        entirely: { period: { category_id: 'main-category' } },
      };

      const simpleKeyPathTransform = {
        productId: 'something.id',
        displayName: 'else.name',
        categoryId: 'entirely.period.category_id',
      };

      const result = Transform.render(simpleKeyPathTransform, product);

      assert.deepEqual(result, {
        productId: 'product-123',
        displayName: 'Product 123',
        categoryId: 'main-category',
      });
    });

    it('should render a transformed document with inline functions', async () => {
      const product = {
        something: { id: 'product-123' },
        else: { name: 'Product 123' },
        entirely: { period: { category_id: 'main-category' } },
      };

      const simpleKeyTransform = {
        productId: (key, doc) => doc.something.id,
        displayName: (key, doc) => ({ [key]: doc.else.name }),
        categoryId: (key, doc) => doc.entirely.period.category_id,
      };

      const result = Transform.render(simpleKeyTransform, product);

      assert.deepEqual(result, {
        productId: 'product-123',
        displayName: {
          displayName: 'Product 123',
        },
        categoryId: 'main-category',
      });
    });

    it('should render a transformed document with spread operator', async () => {
      const product = {
        id: 'product-123',
        name: 'Product 123',
        category_id: 'main-category',
      };

      const simpleSpreadTransform = {
        '...': (key, doc) => ({
          productId: doc.id,
          displayName: doc.name,
          categoryId: doc.category_id
        }),
      };

      const result = Transform.render(simpleSpreadTransform, product);

      assert.deepEqual(result, {
        productId: 'product-123',
        displayName: 'Product 123',
        categoryId: 'main-category',
      });
    });
  });
});

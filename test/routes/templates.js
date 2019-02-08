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
  Template,
  Tenant,
} = require('../../lib/db');

const {
  TEMPLATE_API_VERSION,
  TEMPLATE_COLLECTION_NAME,
  X_STORE_TOKEN,
} = require('../../lib/constants');

const PORT = 3000;
const TENANT_ID = 'test-tenant';
const TEST_DOMAIN = '.domain.local';
const baseUrl = `http://${TENANT_ID}${TEST_DOMAIN}:${PORT}`;
const request = require('supertest').agent(baseUrl);

describe('/templates/v1 API', function test() {
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

  context('GET /templates/v1', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/templates/v1')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 w/ bad auth token', async () => {
      const { body } = await request.get('/templates/v1?token=velma')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/templates/v1?token=${token}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/templates/v1')
        .expect('Content-Type', /json/)
        .set(X_STORE_TOKEN, token)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.ok(body.data);
    });
  });

  context('POST /templates/v1/:templateId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/templates/v1/product-xml')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new entity', async () => {
      const { body } = await request.post('/templates/v1/product-xml')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.equal(body.id, 'product-xml');
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /templates/v1/:templateId', () => {
    it('should get existing Template', async () => {
      const { body } = await request.get('/templates/v1/product-xml')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.equal(body.id, 'product-xml');
    });

    it('should NOT get non-existing entity', async () => {
      const { body } = await request.get('/templates/v1/joseph')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /templates/v1/:templateId', () => {
    it('should UPDATE an existing Template', async () => {
      const { body } = await request.patch('/templates/v1/product-xml')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.equal(body.id, 'product-xml');
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Template', async () => {
      const { body } = await request.patch('/templates/v1/gerald')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /templates/v1/:templateId', () => {
    it('should REPLACE an existing Template', async () => {
      const { body } = await request.put('/templates/v1/product-xml')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.equal(body.id, 'product-xml');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /templates/v1/:templateId', () => {
    it('should DELETE an existing Template', async () => {
      const { body } = await request.delete('/templates/v1/product-xml')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, TEMPLATE_API_VERSION);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, TEMPLATE_COLLECTION_NAME);
      assert.equal(body.id, 'product-xml');
    });

    it('should NOT DELETE a non-existing Template', async () => {
      const { body } = await request.delete('/templates/v1/product-xml')
        .set('Accept', 'application/json')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });

  context('GET /templates/v1/product-detail-xml/render?pid=product-123', () => {
    let product,
      product2;

    before(async () => {
      await Entity.create(db, 'products', {});
      product = await Instance.create(db, 'products', 'product-124', { name: 'Product 124' });
      product2 = await Instance.create(db, 'products', 'product-125', { name: 'Product 125' });
      await Context.create(db, 'product-detail', {
        bindings: {
          product: {
            entity: 'products',
            param: 'pid',
          },
          upsellProduct: {
            entity: 'products',
            param: 'upid',
          },
        },
      });
      await Template.create(db, 'product-xml', {
        content: '<product id="{{id}}" name="{{name}}"></product>',
        contentType: 'text/xml',
      });
      await Template.create(db, 'product-detail-xml', {
        content: '<product id="{{product.id}}" name="{{product.name}}"></product>',
        contentType: 'text/xml',
      });
    });

    it('should return a rendered dynamic template from an instance', async () => {
      const { text } = await request.get(`/templates/v1/product-xml/render/products/${product2.id}`)
        .set('Accept', 'text/xml')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /xml/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(text, `<product id="${product2.id}" name="${product2.name}"></product>`);
    });

    it('should return a rendered dynamic template from a context', async () => {
      // eslint-disable-next-line max-len
      const { text } = await request.get(`/templates/v1/product-detail-xml/render/contexts/product-detail?pid=${product.id}&upid=${product2.id}`)
        .set('Accept', 'text/xml')
        .set(X_STORE_TOKEN, token)
        .expect('Content-type', /xml/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(text, `<product id="${product.id}" name="${product.name}"></product>`);
    });
  });
});

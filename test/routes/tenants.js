// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const app = require('../../app');

const PORT = 3000;
const baseUrl = `http://localhost:${PORT}`;
const request = require('supertest').agent(baseUrl);

const { TENANT_TOKEN } = process.env;

describe('/tenants/v1 API', () => {
  let server;
  before(async () => {
    server = await app.listen(PORT);
  });
  after(async () => {
    server.close();
  });

  context('GET /tenants/v1', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.get('/tenants/v1')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should fail with a 403 an incorrect auth token', async () => {
      const { body } = await request.get('/tenants/v1')
        .set('X-Tenant-Token', 'wrongone')
        .expect('Content-type', /json/)
        .expect(403);

      assert.ok(body.error, 'Forbidden');
    });

    it('should work using query token', async () => {
      const { body } = await request.get(`/tenants/v1?token=${TENANT_TOKEN}`)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.ok(body.data);
    });

    it('should work with header token', async () => {
      const { body } = await request.get('/tenants/v1')
        .expect('Content-type', /json/)
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.ok(body.data);
    });
  });

  context('POST /tenants/v1/:tenantId', () => {
    it('should fail with a 401 w/o the auth token', async () => {
      const { body } = await request.post('/tenants/v1/joe')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .expect('Content-type', /json/)
        .expect(401);

      assert.ok(body.error, 'Unauthorized');
    });

    it('should create a new tenant', async () => {
      const { body } = await request.post('/tenants/v1/joe')
        .send({ other: 'stuff' })
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(201);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.equal(body.id, 'joe');
      assert.ok(body.accessToken);
      assert.equal(body.other, 'stuff');
    });
  });

  context('GET /tenants/v1/:tenantId', () => {
    it('should get existing tenant', async () => {
      const { body } = await request.get('/tenants/v1/joe')
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.equal(body.id, 'joe');
    });

    it('should NOT get non-existing tenant', async () => {
      const { body } = await request.get('/tenants/v1/joseph')
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PATCH /tenants/v1/:tenantId', () => {
    it('should UPDATE an existing Tenant', async () => {
      const { body } = await request.patch('/tenants/v1/joe')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.equal(body.id, 'joe');
      assert.ok(body.accessToken);
      assert.equal(body.other, 'stuff');
      assert.equal(body.other2, 'stuff2');
    });

    it('should NOT UPDATE a non-existing Tenant', async () => {
      const { body } = await request.patch('/tenants/v1/gerald')
        .send({ other2: 'stuff2' })
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(404);

      assert.ok(body.error);
    });
  });

  context('PUT /tenants/v1/:tenantId', () => {
    it('should REPLACE an existing Tenant', async () => {
      const { body } = await request.put('/tenants/v1/joe')
        .send({ other: 'stuff', accessToken: 'freddy' })
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.equal(body.id, 'joe');
      assert.equal(body.accessToken, 'freddy');
      assert.equal(body.other, 'stuff');
    });
  });

  context('DELETE /tenants/v1/:tenantId', () => {
    it('should DELETE an existing Tenant', async () => {
      const { body } = await request.delete('/tenants/v1/joe')
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(200);

      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._v, 1);
      // eslint-disable-next-line no-underscore-dangle
      assert.equal(body._entity, 'tenants');
      assert.equal(body.id, 'joe');
    });

    it('should NOT DELETE a non-existing Tenant', async () => {
      const { body } = await request.delete('/tenants/v1/joe')
        .set('Accept', 'application/json')
        .set('X-Tenant-Token', TENANT_TOKEN)
        .expect('Content-type', /json/)
        .expect(404);

      // eslint-disable-next-line no-underscore-dangle
      assert.ok(body.error);
    });
  });
});

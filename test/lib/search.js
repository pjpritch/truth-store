// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const search = require('../../lib/search');

const { ES_WAIT_TIME } = require('../../lib/constants');

describe('lib/search.js', function test() {
  this.timeout(3000);
  before(async () => {
  });

  after(async () => {
  });

  it('should create an index something in es', async () => {
    const value = { id: 'something-123', something: 'interesting' };
    await search.createIndex('test-tenant', 'products', null, { force: true });
    await search.indexInstance('test-tenant', 'products', value);
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ES_WAIT_TIME);
    });
    const results = await search.search('test-tenant', 'products', 'something:interesting');
    // eslint-disable-next-line no-underscore-dangle
    const matches = results.hits.hits.map(hit => hit._source);
    await search.deleteIndex('test-tenant', 'products');

    assert.equal(matches.length, 1);
    assert.deepEqual(value, matches[0]);
  });

  it('should searchAll in es', async () => {
    const value = { id: 'something-123', something: 'interesting' };
    await search.createIndex('test-tenant', 'products', null, { force: true });
    await search.indexInstance('test-tenant', 'products', value);
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ES_WAIT_TIME);
    });
    const results = await search.searchAll('test-tenant', 'something:interesting');
    // eslint-disable-next-line no-underscore-dangle
    const matches = results.hits.hits.map(hit => hit._source);
    await search.deleteIndex('test-tenant', 'products');

    assert.equal(matches.length, 1);
    assert.deepEqual(value, matches[0]);
  });
});

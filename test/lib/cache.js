// Copyright 2019 Peter Pritchard.  All rights reserved.
/* eslint-env node, mocha */

const assert = require('assert');
const cache = require('../../lib/cache');

describe('lib/cache.js', function test() {
  this.timeout(10000);

  before(async () => {
  });

  after(async () => {
  });

  it('should cache something in redis', async () => {
    const value = { id: 'product-123', something: 'interesting' };
    await cache.cacheInstance('tenant', 'entity', value, 1);
    const result2 = await cache.getInstance('tenant', 'entity', value.id);

    assert.deepEqual(value, result2);

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    const result3 = await cache.getInstance('tenant', 'entity', value.id);

    assert(!result3);
  });

  it('should touch something in redis', async () => {
    const value = { id: 'product-124', something: 'interesting' };
    await cache.cacheInstance('tenant', 'entity', value, 1);
    const result2 = await cache.getInstance('tenant', 'entity', value.id);

    assert.deepEqual(value, result2);

    await cache.touchInstance('tenant', 'entity', value.id, 2);
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    const result4 = await cache.getInstance('tenant', 'entity', value.id);
    assert.deepEqual(value, result4);
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });

    const result5 = await cache.getInstance('tenant', 'entity', value.id);
    assert(!result5);
  });

  it('should delete something from the cache in redis', async () => {
    const value = { id: 'product-125', something: 'interesting' };
    await cache.cacheInstance('tenant', 'entity', value, 1);
    await cache.invalidateInstance('tenant', 'entity', value.id);
    const result2 = await cache.getInstance('tenant', 'entity', value.id);

    assert(!result2);
  });
});

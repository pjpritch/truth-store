const { DEFAULT_CACHE_PERIOD, DEFAULT_REDIS_URL } = require('./constants');
const redis = require('redis');

const { isObject } = require('util');

const client = redis.createClient({
  url: process.env.REDIS_URL || DEFAULT_REDIS_URL,
});

function instanceId(tenantId, entityId, id) {
  return `${tenantId}__${entityId}__${id}`;
}

function decodeValue(reply) {
  let object = reply;

  if (reply && reply.length >= 2 && (reply[0] === '{' || reply[0] === '[')) {
    object = JSON.parse(reply);
  }

  return object;
}

function encodeValue(value) {
  let object = value;

  if (value && isObject(value)) {
    object = JSON.stringify(value);
  }

  return object;
}

function getClient() {
  return client;
}

async function getInstance(tenantId, entityId, id) {
  const key = instanceId(tenantId, entityId, id);

  return new Promise((resolve, reject) => {
    client.get(key, (err, reply) => {
      if (err) return reject(err);

      const value = decodeValue(reply);
      return resolve(value);
    });
  });
}

async function cacheInstance(tenantId, entityId, instance, ttl = DEFAULT_CACHE_PERIOD) {
  const key = instanceId(tenantId, entityId, instance.id);

  return new Promise((resolve, reject) => {
    const object = encodeValue(instance);
    client.set(key, object, 'EX', ttl, (err, reply) => {
      if (err) return reject(err);

      return resolve(reply);
    });
  });
}

async function touchInstance(tenantId, entityId, id, seconds = DEFAULT_CACHE_PERIOD) {
  const key = instanceId(tenantId, entityId, id);

  return new Promise((resolve, reject) => {
    client.expire(key, seconds, (err, reply) => {
      if (err) return reject(err);

      return resolve(reply);
    });
  });
}

async function invalidateInstance(tenantId, entityId, id) {
  const key = instanceId(tenantId, entityId, id);

  return new Promise((resolve, reject) => {
    client.del(key, (err, reply) => {
      if (err) return reject(err);

      return resolve(reply);
    });
  });
}

module.exports = {
  getClient,
  getInstance,
  cacheInstance,
  touchInstance,
  invalidateInstance,
};

// Copyright 2019 Peter Pritchard.  All rights reserved.

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  CHANGE_EVENT_TYPE: 'change',
  DELETE_EVENT_TYPE: 'delete',
  GET_EVENT_TYPE: 'get',
  ES_WAIT_TIME: 1000,
  DEFAULT_MONGO_URL: 'mongodb://127.0.0.1:27017/test',
  DEFAULT_REDIS_URL: 'redis://127.0.0.1:6379/1',
  DEFAULT_AMQP_URL: 'amqp://user:user@localhost',
  DEFAULT_ES_URL: 'localhost:9200',
  DEFAULT_CACHE_PERIOD: 60,
  DEFAULT_COUNT: 24,
  ENTITY_COLLECTION_NAME: '_entities',
  ENTITY_API_VERSION: 1,
  GLOBAL_NAMESPACE: 'global',
  TENANT_COLLECTION_NAME: '_tenants',
  TENANT_API_VERSION: 1,
  APP_COLLECTION_NAME: '_apps',
  APP_API_VERSION: 1,
  TEMPLATE_COLLECTION_NAME: '_templates',
  TEMPLATE_API_VERSION: 1,
  TRANSFORM_COLLECTION_NAME: '_transforms',
  TRANSFORM_API_VERSION: 1,
  WEBHOOK_COLLECTION_NAME: '_webhooks',
  WEBHOOK_API_VERSION: 1,
  CONTEXT_COLLECTION_NAME: '_contexts',
  CONTEXT_API_VERSION: 1,
  INSTANCE_API_VERSION: 1,
  X_TENANT_TOKEN: 'x-tenant-token',
  X_STORE_TOKEN: 'x-store-token',
  DEFAULT_API_ERROR: 400,
  API_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_RATE_LIMIT_MAX: isProduction ? 100 : 1000,
  MUTATIONS_QUEUE: 'mutations',
  SHOULD_POST_GETS: false,
};

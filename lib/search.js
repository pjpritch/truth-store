const es = require('elasticsearch');
const { DEFAULT_ES_URL } = require('./constants');

const internalClient = new es.Client({
  host: process.env.ES_URL || DEFAULT_ES_URL,
});

function indexId(tenantId, entityId) {
  return `${tenantId}__${entityId}`;
}

function getClient() {
  return internalClient;
}

async function searchAll(tenantId, query) {
  const index = indexId(tenantId, '*');
  const response = await internalClient.search({
    index,
    q: query,
  });

  return response;
}

async function search(tenantId, entityId, query) {
  const index = indexId(tenantId, entityId);
  const response = await internalClient.search({
    index,
    q: query,
  });

  return response;
}

async function unindexInstance(tenantId, entityId, id) {
  const index = indexId(tenantId, entityId);
  const response = await internalClient.delete({
    index,
    type: entityId,
    id,
  });

  return response;
}

async function indexInstance(tenantId, entityId, body, reindex = false) {
  const index = indexId(tenantId, entityId);
  const { id } = body;
  const indexOp = reindex ? 'reindex' : 'index';
  const response = await internalClient[indexOp]({
    index,
    type: entityId,
    id,
    body,
  });

  return response;
}

async function deleteIndex(tenantId, entityId, body) {
  const index = indexId(tenantId, entityId);
  const response = await internalClient.indices.delete({
    index,
    body,
  });

  return response;
}

async function createIndex(tenantId, entityId, body, options = {}) {
  const index = indexId(tenantId, entityId);
  if (options.force) {
    const oldIndex = await internalClient.indices.exists({ index });
    if (oldIndex) {
      await deleteIndex(tenantId, entityId);
    }
  }
  const response = await internalClient.indices.create({
    index,
    body,
  });

  return response;
}

async function replaceIndexMapping(tenantId, entityId, body) {
  const index = indexId(tenantId, entityId);
  const response = await internalClient.indices.putMapping({
    index,
    type: entityId,
    body,
  });

  return response;
}

module.exports = {
  getClient,
  createIndex,
  deleteIndex,
  indexInstance,
  unindexInstance,
  replaceIndexMapping,
  search,
  searchAll,
};

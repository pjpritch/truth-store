const queue = require('./lib/queue');
const cache = require('./lib/cache');
const search = require('./lib/search');
const { GLOBAL_NAMESPACE } = require('./lib/constants');

async function handleChangeEvent(msg) {
  const {
    _tenantId,
    _entityId,
    type,
    info,
  } = msg;

  const isCustomObject = (_tenantId !== GLOBAL_NAMESPACE && _entityId[0] !== '_');
  // eslint-disable-next-line no-console,object-curly-newline
  console.log(`Handling Change Event: ${{ _tenantId, _entityId, type, info }}`);
  if (type === 'change') {
    await cache.invalidateInstance(_tenantId, _entityId, info.instanceId);

    if (isCustomObject) {
      await search.indexInstance(_tenantId, _entityId, info.instance);
    }
  } else if (type === 'delete') {
    await cache.invalidateInstance(_tenantId, _entityId, info.id);

    if (isCustomObject) {
      await search.unindexInstance(_tenantId, _entityId, info.instanceId);
    }
  } else if (type === 'get') {
    await cache.cacheInstance(_tenantId, _entityId, info.instance);
  } else {
    console.log(`Unknown Event Type: '${type}'`);
    console.log(msg);
  }
}

(async () => {
  await queue.init(1);

  await queue.subscribeChangeEvents(async (msg) => {
    const { content } = msg;

    try {
      const event = JSON.parse(content);

      await handleChangeEvent(event);
      console.log(event);
      queue.ack(msg);
    } catch (e) {
      queue.reject(msg);
    }
  });

  console.log('Listening for mutation events.');
})();

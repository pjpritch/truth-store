// Copyright 2019 Peter Pritchard.  All rights reserved.

const debug = require('debug')('queue-worker');
const queue = require('./lib/queue');

const {
  CHANGE_EVENT_TYPE,
  DELETE_EVENT_TYPE,
  GET_EVENT_TYPE,
} = require('./lib/constants');

const { Instance } = require('./lib/db');

async function handleChangeEvent(msg) {
  const {
    _tenantId,
    _entityId,
    type,
    info,
  } = msg;

  // eslint-disable-next-line object-curly-newline
  debug(`Handling Change Event: ${{ _tenantId, _entityId, type, info }}`);

  switch (type) {
    case CHANGE_EVENT_TYPE:
      await Instance.doAfterChange(_tenantId, _entityId, info.instance);
      break;
    case DELETE_EVENT_TYPE:
      await Instance.doAfterDelete(_tenantId, _entityId, info.instanceId);
      break;
    case GET_EVENT_TYPE:
      await Instance.doAfterGet(_tenantId, _entityId, info.instance);
      break;
    default:

      debug(`Unknown Event Type: '${type}'`);
      debug(msg);
  }
}

(async () => {
  await queue.init(1);

  await queue.subscribeChangeEvents(async (msg) => {
    const { content } = msg;

    try {
      const event = JSON.parse(content);

      await handleChangeEvent(event);

      debug(event);
      queue.ack(msg);
    } catch (e) {
      queue.reject(msg);
    }
  });

  debug('Listening for mutation events.');
})();

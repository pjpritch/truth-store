// Copyright 2019 Peter Pritchard.  All rights reserved.

const amqp = require('amqplib');
const { DEFAULT_AMQP_URL, MUTATIONS_QUEUE } = require('./constants');

const { AMQP_URL } = process.env;

let internalClient,
  internalChannel;

async function init(prefetch) {
  if (internalChannel) {
    console.log('already inited');
  } else {
    internalClient = await amqp.connect(AMQP_URL || DEFAULT_AMQP_URL);
    internalChannel = await internalClient.createChannel();

    internalChannel.on('error', (args) => {
      console.log(args);
    });

    // limit msgs to (prefetch at a time)
    if (prefetch) internalChannel.prefetch(prefetch);
  }
}

async function publishChangeEvent(tenantId, entityId, event = {}) {
  const payload = {
    _tenantId: tenantId,
    _entityId: entityId,
    ...event
  };
  await internalChannel.assertQueue(MUTATIONS_QUEUE, { durable: true });
  const buffer = JSON.stringify(payload);
  return internalChannel.sendToQueue(MUTATIONS_QUEUE, Buffer.from(buffer), { persistent: true });
}

async function subscribeChangeEvents(cb) {
  await internalChannel.consume(MUTATIONS_QUEUE, cb);
}

async function ack(msg) {
  return internalChannel.ack(msg);
}

async function reject(msg) {
  return internalChannel.reject(msg);
}

module.exports = {
  publishChangeEvent,
  subscribeChangeEvents,
  ack,
  reject,
  init,
};

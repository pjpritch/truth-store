// Copyright 2019 Peter Pritchard.  All rights reserved.

const http = require('http');

const options = {
  host: 'localhost',
  port: '3000',
  timeout: 2000,
  path: '/status',
};

const request = http.request(options, (res) => {
  debug(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`ERROR: ${err.message}\n${err.stack}`);
  process.exit(1);
});

request.end();

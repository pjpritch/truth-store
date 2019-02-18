// Copyright 2019 Peter Pritchard.  All rights reserved.

const {
  get,
  isArray,
  flatten,
  map,
} = require('lodash');

// https://gist.github.com/anvaka/3815296
// jsonString = JSON.stringify(person, functionReplacer);
// restoredPerson = JSON.parse(jsonString, functionReviver);
function functionReplacer(key, value) {
  if (typeof value === 'function') {
    return value.toString();
  }
  return value;
}

function functionReviver(key, value) {
  if (key === '') return value;

  if (typeof value === 'string') {
    const rfunc = /function[^(]*\(([^)]*)\)[^{]*{([^}]*)\}/;
    const match = value.match(rfunc);

    if (match) {
      const args = match[1].split(',').map(arg => arg.replace(/\s+/, ''));
      // eslint-disable-next-line no-new-func
      return new Function(args, match[2]);
    }
  }

  return value;
}

function removePrivateFieldsFromObjects(objs = []) {
  return objs.map((obj) => {
    // eslint-disable-next-line no-underscore-dangle,no-param-reassign
    delete obj._id;
    return obj;
  });
}

function removePrivateFieldsFromObject(obj = {}) {
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    if (key.indexOf('_') === 0) {
      // eslint-disable-next-line no-param-reassign
      delete obj[key];
    } else {
      // eslint-disable-next-line no-param-reassign
      obj[key] = functionReviver(key, obj[key]);
    }
  });
  return obj;
}

function evaluateKeyPath(input, path) {
  const parts = path.split('.');
  let temp = input;
  let part;

  for (let i = 0, ii = parts.length; i < ii; i += 1) {
    part = parts[i];

    if (isArray(temp)) {
      if ((part - 0) === part) {
        // Array subscript
        temp = temp[part];
      } else {
        // dereferencing property
        // eslint-disable-next-line
        temp = flatten(map(temp, (val) => {
          return get(val, part);
        }));
      }
    } else {
      temp = get(temp, part);
    }
    if (!temp) break;
  }
  return temp;
}

module.exports = {
  removePrivateFieldsFromObject,
  removePrivateFieldsFromObjects,
  evaluateKeyPath,
  functionReplacer,
  functionReviver,
};

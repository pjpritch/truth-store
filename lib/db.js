// Copyright 2019 Peter Pritchard.  All rights reserved.

const {
  evaluateKeyPath,
  removePrivateFieldsFromObject,
  removePrivateFieldsFromObjects
} = require('./utils');

const {
  DEFAULT_MONGO_URL,
  DEFAULT_COUNT,
  DEFAULT_API_ERROR,
  GLOBAL_NAMESPACE,
  TENANT_COLLECTION_NAME,
  APP_COLLECTION_NAME,
  ENTITY_COLLECTION_NAME,
  INSTANCE_API_VERSION,
  TEMPLATE_COLLECTION_NAME,
  TRANSFORM_COLLECTION_NAME,
  WEBHOOK_COLLECTION_NAME,
  CONTEXT_COLLECTION_NAME,
  CHANGE_EVENT_TYPE,
  DELETE_EVENT_TYPE,
} = require('./constants');

const { NotFoundError } = require('./errors');

const { isArray } = require('util');
const uuid = require('uuid');
const { find } = require('lodash');
const { handlebars } = require('hbs');
const request = require('axios');
const { MongoClient } = require('mongodb');
const pathToRegex = require('path-to-regexp');
const { get } = require('lodash');

const cache = require('./cache');
const search = require('./search');
const queue = require('./queue');

const { MONGO_URL } = process.env;
const mongoUrl = MONGO_URL || DEFAULT_MONGO_URL;

const { USE_MQ } = process.env;
const shouldDefer = USE_MQ === 'true';

const internalClient = new MongoClient(mongoUrl, { useNewUrlParser: true });

(async () => {
  await internalClient.connect();
  if (process.env.USE_MQ === 'true') {
    await queue.init();
  }
})();

function globalDB() {
  return internalClient.db(GLOBAL_NAMESPACE);
}

function tenantDB(tenantId) {
  return internalClient.db(tenantId);
}

function isSystemEntity(entityId) {
  return entityId[0] === '_';
}

class Instance {
  static type() { return null; }
  static version() { return INSTANCE_API_VERSION; }

  static async doAfterChange(tenantId, entityId, instance) {
    await cache.invalidateInstance(tenantId, entityId, instance.id);

    if (!isSystemEntity(entityId)) {
      await search.indexInstance(tenantId, entityId, instance);
    }
  }

  static async doAfterGet(tenantId, entityId, instance) {
    if (tenantId && entityId && instance) {
      await cache.cacheInstance(tenantId, entityId, instance);
    }
  }

  static async doAfterDelete(tenantId, entityId, instanceId) {
    await cache.invalidateInstance(tenantId, entityId, instanceId);

    if (!isSystemEntity(entityId)) {
      await search.unindexInstance(tenantId, entityId, instanceId);
    }
  }

  static async afterChange(db, entityId, instance) {
    const { databaseName } = db;

    if (!shouldDefer) {
      await this.doAfterChange(databaseName, entityId, instance);
    } else {
      await queue.publishChangeEvent(databaseName, entityId, {
        type: CHANGE_EVENT_TYPE,
        info: {
          instance,
        },
      });
    }
  }

  static async afterDelete(db, entityId, instance) {
    const { databaseName } = db;

    if (!shouldDefer) {
      await this.doAfterDelete(databaseName, entityId, instance.id);
    } else {
      await queue.publishChangeEvent(databaseName, entityId, {
        type: DELETE_EVENT_TYPE,
        info: {
          instanceId: instance.id,
        },
      });
    }
  }

  static async afterGet(db, entityId, instance) {
    const { databaseName } = db;

    if (databaseName && entityId && instance) {
      await this.doAfterGet(databaseName, entityId, instance);
    }
  }

  static async find(db, entityId, options) {
    const { start, count, query } = options;
    const skip = start ? start - 0 : 0;
    const limit = count ? count - 0 : DEFAULT_COUNT;

    const col = db.collection(entityId);
    const total = await col.countDocuments();
    const result = await col.find(query || {}, { skip, limit }).toArray();

    const data = removePrivateFieldsFromObjects(result);

    return {
      data,
      start: skip,
      count: data.length,
      total,
    };
  }

  static async findOne(db, entityId, instanceId) {
    const { databaseName } = db;
    const ids = instanceId.split(',');
    const idCount = ids.length;
    const notFromCache = [];

    // read as many instances from the cache as possible
    // returns an array (including nulls), which should match
    // the length of the ids array
    const results = await cache.getInstances(databaseName, entityId, ids);
    const afterResults = results.map((result, i) => {
      if (result) {
        return result;
      }

      notFromCache.push(i);
      return db.collection(entityId).findOne({ id: ids[i] });
    });

    const resolvedInstances = await Promise.all(afterResults);
    const instances = resolvedInstances.map((result) => {
      if (result) {
        return removePrivateFieldsFromObject(result);
      }
      return null;
    });

    if (notFromCache.length > 0) {
      await Promise.all(notFromCache.map((index) => {
        const instance = instances[index];
        if (instance) {
          return this.afterGet(db, entityId, instance);
        }
        return null;
      }));
    }

    return idCount === 1 ? instances[0] : instances;
  }

  static async create(db, entityId, instanceId, body) {
    let objectId = instanceId;
    if (!objectId) {
      objectId = uuid.v4();
    }
    const obj = {
      ...body,
      id: objectId,
    };

    await db.collection(entityId).findOneAndReplace(
      { id: objectId },
      obj,
      { upsert: true },
    );

    const instance = removePrivateFieldsFromObject(obj);
    await this.afterChange(db, entityId, instance);
    return instance;
  }

  static async replace(db, entityId, instanceId, body) {
    const obj = {
      ...body,
      id: instanceId,
    };

    await db.collection(entityId).findOneAndReplace(
      { id: instanceId },
      obj,
      { upsert: true },
    );

    const instance = removePrivateFieldsFromObject(obj);
    await this.afterChange(db, entityId, instance);
    return instance;
  }

  static async update(db, entityId, instanceId, body) {
    const obj = {
      ...body,
      id: instanceId,
    };

    let result = await db.collection(entityId).updateOne(
      { id: instanceId },
      { $set: obj },
    );

    if (result.modifiedCount === 0) return false;

    result = await db.collection(entityId).findOne({ id: instanceId });

    const instance = removePrivateFieldsFromObject(result);
    await this.afterChange(db, entityId, instance);
    return instance;
  }

  static async delete(db, entityId, instanceId) {
    const result = await db.collection(entityId).findOneAndDelete({ id: instanceId });
    const instance = result && result.value ? removePrivateFieldsFromObject(result.value) : null;

    if (instance) {
      await this.afterDelete(db, entityId, instance);
    }

    return instance;
  }

  static handleAPIResponse(res, entityId, body, status = 200) {
    res.status(status).json({
      _v: this.version(),
      _entity: entityId,
      ...body,
    });
  }

  static handleAPIErrorResponse(res, entityId, e = {}, msg) {
    res.status(e.status || DEFAULT_API_ERROR).json({
      _v: this.version(),
      _entity: entityId,
      error: msg || e.message,
    });
  }
}

class SystemInstance {
  static type() { throw new Error('Unimplemented'); }
  static version() { return 1; }
  static find(db, options) {
    return Instance.find(db, this.type(), options);
  }
  static findOne(db, instanceId) {
    return Instance.findOne(db, this.type(), instanceId);
  }
  static create(db, instanceId, body) {
    return Instance.create(db, this.type(), instanceId, body);
  }
  static replace(db, instanceId, body) {
    return Instance.replace(db, this.type(), instanceId, body);
  }
  static update(db, instanceId, body) {
    return Instance.update(db, this.type(), instanceId, body);
  }
  static delete(db, instanceId) {
    return Instance.delete(db, this.type(), instanceId);
  }
  static handleAPIResponse(res, body, status = 200) {
    res.status(status).json({
      _v: this.version(),
      _entity: this.type(),
      ...body,
    });
  }

  static handleAPIErrorResponse(res, e = {}, msg) {
    res.status(e.status || DEFAULT_API_ERROR).json({
      _v: this.version(),
      _entity: this.type(),
      error: msg || e.message
    });
  }
}

class Entity extends SystemInstance {
  static type() { return ENTITY_COLLECTION_NAME; }
  static async create(db, entityId, body) {
    const entity = await Instance.create(db, this.type(), entityId, body);
    const { databaseName } = db;
    if (entity) {
      await db.createCollection(entityId);
      await search.createIndex(databaseName, entityId, null, { force: true });
    }
    return entity;
  }

  static async delete(db, entityId) {
    const entity = await Instance.delete(db, this.type(), entityId);
    const { databaseName } = db;
    if (entity) {
      await search.deleteIndex(databaseName, entityId);
    }
    return entity;
  }
}

class Context extends SystemInstance {
  static type() { return CONTEXT_COLLECTION_NAME; }
  static async resolveContext(db, context, query = {}) {
    const objectIds = [];
    const derivedIds = [];

    const staticKeys = [];
    const derivedKeys = [];
    const derivedValues = [];

    const dynamicContext = {};
    let hasUnboundBindings = false;

    if (!context) throw new NotFoundError();

    const { bindings } = context;
    const bindingKeys = Object.keys(bindings);

    if (bindings) {
      bindingKeys.forEach((key) => {
        const {
          entity,
          param,
          defaultValue,
        } = bindings[key];

        const queryValue = query[param] || defaultValue;

        if (queryValue && queryValue.indexOf('.') > -1) {
          // dot means dynamic relationship binding
          derivedIds.push(`${entity}__${queryValue}`);
          derivedValues.push(queryValue);
          derivedKeys.push(key);
        } else {
          objectIds.push(queryValue ? Instance.findOne(db, entity, queryValue) : null);
          staticKeys.push(key);
        }
      });

      const staticObjects = await Promise.all(objectIds) || [];
      if (staticKeys && staticKeys.length > 0) {
        staticKeys.forEach((bindingKey, i) => {
          const object = staticObjects[i];
          if (!object || object.error) {
            const { required } = bindings[bindingKey];
            if (required === true) {
              hasUnboundBindings = true;
              dynamicContext[bindingKey] = {};
            } else {
              dynamicContext[bindingKey] = null;
            }
          } else if (isArray(object)) {
            dynamicContext[bindingKey] = object;
          } else {
            dynamicContext[bindingKey] = object;
          }
        });
      }

      if (derivedValues && derivedValues.length > 0) {
        derivedValues.forEach((bindingValue, i) => {
          const value = evaluateKeyPath(dynamicContext, bindingValue);
          derivedIds[i] = derivedIds[i].replace(bindingValue, value);
        });
      }

      const derivedObjects = derivedIds.map((id) => {
        const [entityId, instanceId] = id.split('__');
        return Instance.findOne(db, entityId, instanceId);
      });
      const dynamicObjects = await Promise.all(derivedObjects);
      if (derivedKeys && derivedKeys.length > 0) {
        derivedKeys.forEach((bindingKey, i) => {
          const object = dynamicObjects[i];
          if (!object || object.error) {
            const { required } = bindings[bindingKey];
            if (required === true) {
              hasUnboundBindings = true;
              dynamicContext[bindingKey] = {};
            } else {
              dynamicContext[bindingKey] = null;
            }
          } else {
            dynamicContext[bindingKey] = object;
          }
        });
      }
    }

    return hasUnboundBindings ? null : dynamicContext;
  }
}

class Template extends SystemInstance {
  static type() { return TEMPLATE_COLLECTION_NAME; }
  static find(db, options) {
    return Instance.find(db, this.type(), options);
  }
  static findOne(db, instanceId) {
    return Instance.findOne(db, this.type(), instanceId);
  }

  static render(template, ctx) {
    const templateFunc = handlebars.compile(template.content);
    return templateFunc(ctx);
  }
}

class App extends SystemInstance {
  static type() { return APP_COLLECTION_NAME; }
  static matchedRoute(req, app) {
    const originalUrl = req.path;

    // Loop through tenant routes and return first match
    const { routes } = app;
    if (!routes) return false;

    const params = {};
    const matchRoute = find(routes, (route) => {
      const { path } = route;
      const keys = [];
      const regex = pathToRegex(path, keys);
      const result = regex.exec(originalUrl);
      if (result && result.length > 1) {
        let value;

        for (let i = 1, ii = result.length; i < ii; i += 1) {
          value = result[i];
          params[keys[i - 1].name] = value;
        }
      }

      return result;
    });

    if (matchRoute) matchRoute.params = params;

    return matchRoute;
  }
}

class Transform extends SystemInstance {
  static type() { return TRANSFORM_COLLECTION_NAME; }

  static render(transform, source) {
    // Loop over each attribute, and look up the value
    const outDoc = {};
    const keys = Object.keys(transform);
    keys.forEach((key) => {
      const xform = transform[key];
      let result;
      if (xform instanceof Function) {
        result = xform.bind(transform)(key, source, outDoc);
      } else {
        result = get(source, xform);
      }

      // special attribute returns a hash
      if (key === '...') {
        Object.assign(outDoc, result);
      } else {
        outDoc[key] = result;
      }
    });

    return outDoc;
  }
}

/**
 * Implements an out-going REST API upon matching object mutations
 */
class Webhook extends SystemInstance {
  static type() { return WEBHOOK_COLLECTION_NAME; }

  // validates whether event matches (is noteworthy)
  // right now, will be true if underlying data exists
  static match(webhook, type, info) { return !!info; }
  static isSuccess(response) {
    if (response.status > 199 && response.status < 300) {
      return true;
    }
    return false;
  }

  static async trigger(webhook, event) {
    const { type, info } = event;

    try {
      // check to see if this event is worthy
      const shouldPost = this.match(webhook, type, info);

      if (shouldPost) {
        const { method, url } = webhook;
        const response = await request[method || 'post'](url, info);

        if (this.isSuccess(response)) {
          // report success
          console.log(`Successfully sent payload to url: ${url}`);
          console.dir({ method, info });
        } else {
          // report failure
          console.log('Webhook call failed:');
          console.dir({ method, info });
        }
        return response;
      }

      return false;
    } catch (e) {
      return e;
    }
  }
}

// Not a true subclass, but we want it to look like it
class Tenant extends SystemInstance {
  static type() { return TENANT_COLLECTION_NAME; }

  static async create(db, tenantId, body) {
    const accessToken = uuid.v4();
    const obj = { ...body, id: tenantId, accessToken };

    return Instance.create(db, TENANT_COLLECTION_NAME, tenantId, obj);
  }
}

module.exports = {
  Instance,
  Entity,
  Tenant,
  Context,
  Template,
  App,
  Transform,
  Webhook,

  globalDB,
  tenantDB,
};


const {
  evaluateKeyPath,
  removePrivateFieldsFromObject,
  removePrivateFieldsFromObjects
} = require('./utils');

const {
  DEFAULT_CACHE_PERIOD,
  DEFAULT_MONGO_URL,
  DEFAULT_COUNT,
  DEFAULT_API_ERROR,
  GLOBAL_NAMESPACE,
  TENANT_COLLECTION_NAME,
  ENTITY_COLLECTION_NAME,
  INSTANCE_API_VERSION,
  TEMPLATE_COLLECTION_NAME,
  CONTEXT_COLLECTION_NAME,
} = require('./constants');

const { NotFoundError } = require('./errors');

const { isArray } = require('util');
const uuid = require('uuid');
const { handlebars } = require('hbs');
const { MongoClient } = require('mongodb');

const cache = require('./cache');
const search = require('./search');

const { MONGO_URL } = process.env;
const mongoUrl = MONGO_URL || DEFAULT_MONGO_URL;

const internalClient = new MongoClient(mongoUrl, { useNewUrlParser: true });

(async () => {
  await internalClient.connect();
})();

function globalDB() {
  return internalClient.db(GLOBAL_NAMESPACE);
}

function tenantDB(tenantId) {
  return internalClient.db(tenantId);
}

class Instance {
  static type() { return null; }
  static version() { return INSTANCE_API_VERSION; }

  static async afterChange(db, entityId, instance) {
    const { databaseName } = db;

    await cache.invalidateInstance(databaseName, entityId, instance.id);

    if (databaseName !== GLOBAL_NAMESPACE && entityId[0] !== '_') {
      await search.indexInstance(databaseName, entityId, instance);
    }
  }

  static async afterDelete(db, entityId, instance) {
    const { databaseName } = db;
    await cache.invalidateInstance(databaseName, entityId, instance.id);

    if (databaseName !== GLOBAL_NAMESPACE && entityId[0] !== '_') {
      await search.unindexInstance(databaseName, entityId, instance.id);
    }
  }

  static async afterGet(db, entityId, instance) {
    const { databaseName } = db;

    await cache.cacheInstance(databaseName, entityId, instance, DEFAULT_CACHE_PERIOD);
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

    let result = await cache.getInstance(databaseName, entityId, instanceId);
    if (result) return result;

    result = await db.collection(entityId).findOne({ id: instanceId });

    const instance = result ? removePrivateFieldsFromObject(result) : result;
    if (instance) {
      await this.afterGet(db, entityId, instance);
    }
    return instance;
  }

  static async create(db, entityId, instanceId, body) {
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
          objectIds.push(Instance.findOne(db, entity, queryValue));
          staticKeys.push(key);
        }
      });

      const staticObjects = await Promise.all(objectIds) || [];
      if (staticKeys && staticKeys.length > 0) {
        staticKeys.forEach((bindingKey, i) => {
          const object = staticObjects[i];
          if (!object || object.error) {
            const { required } = bindings[bindingKey];
            if (required !== false) {
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

  static render(template, ctx) {
    const templateFunc = handlebars.compile(template.content);
    return templateFunc(ctx);
  }
}

// Not a true subclass, but we want it to look like it
class Tenant extends SystemInstance {
  static type() { return TENANT_COLLECTION_NAME; }
  static async create(db, tenantId, body) {
    const accessToken = uuid.v4();
    const obj = { ...body, id: tenantId, accessToken };
    const result = await Instance.create(db, TENANT_COLLECTION_NAME, tenantId, obj);
    return result;
  }
}

module.exports = {
  Instance,
  Entity,
  Tenant,
  Context,
  Template,

  globalDB,
  tenantDB,
};

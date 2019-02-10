# Overview

This project was started on Feb 1, 2019, after coming up with a rough outline the day before (see _Planned_).

## tl;dr
`docker-compose up -d` will bring up:
* MongoDB
* Redis
* Elastic Search
* Truth Service - run as many instances as needed (`docker-compose up -d --scale truth=2`)
* HAProxy - reachable at `localhost:3333` -or- `${tenantId}.domain.local:3333`
* Mongo Express - reachable at `localhost:3334`


## Planned:

This repo implements a multi-tenant capable object store for any SaaS platform.

Using DNS subdomains, http://_subdomain_._domain_, this service provides a REST API for the following capabilities:

* ~~Tenants API - (de)provisions tenant namespaces and manages AccessToken creation for tenants.  each tenant may also include any metadata.  CRUD/PATCH implemented.~~

* ~~Entities API - manages custom object types (entities).  each entity may also include any metadata.  CRUD/PATCH implemented.~~

* ~~Instances API - manages custom objects, for a single entity.  CRUD/PATCH implemented.~~

* ~~Contexts API - dynamically bound object graphs, meant to aggregate models for rendering an entire context, eg. Product Detail Page = product A + category A + content A + content B + recommended product A, B, ...  CRUD/PATCH + render implemented.~~

* ~~Templates API - render API instances/contexts into HTML, JSON, XML, etc.  Render returns custom Content-Type.  CRUD/PATCH + render implemented.~~

* ~~Optimize for READs: Caching service w/ Redis~~
* ~~Optimize for SEARCH: Search service w/ Elastic Search~~
* ~~Optimize for scale: MQ support for object mutations and workers~~

* Transform API - render API instances/contexts into other schemas, using DB-defined mapping models (key path and inline functions).

* Frontend dashboard for APIs:
- Contexts
- Entities
- Templates

* Dynamic Applications
- Middleware and SDK for ExpressJS app running on same cluster (using k8s internal load balancer and private HTTP header for tenant)

- Mapping routes to context + templates
- "path w/ params and query": {
  layout: 'contains page structure',
  template: 'page detail',
}

- design front end component to client-side render in VueJS


## Getting Started

### Dependencies

bring up mongoDB, redis, elastic search, rabbit mq, ha proxy, the truth api server and the truth work with `docker-compose up -d`.

### What you get

then you can reach the following endpoints (using xip.io):

* http://127.0.0.1.xip.io:3333/tenants/v1(/:tenantId) - CRUD operations - Provision and de-provision tenants
* http://${tenantId}.127.0.0.1.xip.io:3333/entities/v1(/:entityId) - CRUD operations on Custom Object Types (class-level singleton, schemas, ...)
* http://${tenantId}.127.0.0.1.xip.io:3333/objects/v1(/:entityId(/:instanceId)) - CRUD Manage Custom Objects 
* http://${tenantId}.127.0.0.1.xip.io:3333/contexts/v1(/:contextId(/render)) - CRUD Manage & Render Contexts Graphs
* http://${tenantId}.127.0.0.1.xip.io:3333/templates/v1(/:templateId(/render/:entityId/:instanceId)) - CRUD Manage Dynamic Templates

* http://127.0.0.1.xip.io:3334 - Mongo Express - MongoDB Admin app
* http://127.0.0.1.xip.io:15672 - Rabbit MQ Management - Rabbit MQ Admin app

Additionally, 5 additional services are started:

- __MongoDB__ - port 27017 - stores all platform data, with each tenant's information in a single MongoDB namespace - persistent volume attached
- __Redis__ - port 6379 - acts as a cache for the API server and for API limiting middleware (optimize for READ)
- __Elastic Search__ - port 9200 - acts as a search index, one index per tenant/object type (optimize for SEARCH) - persistent volume attached
- __Rabbit MQ__ - port 5672 - acts as a message broker for message queues - persistent volume attached
- __HA Proxy__ - port 3333 - allows for scaling underlying tenant API services, without port conflicts

The Tenant API uses an environment variable: `TENANT_TOKEN` that must be included with all Tenant API calls (either in the `token` query string param or sent as a HTTP header `x-tenant-token`).

Each Tenant object is assigned an `accessToken` property, which must be included with all other API calls (either in the `token` query string param or sent as a HTTP header `x-store-token`).

### Using Docker-based backing services for local development

You can also run and develop the truth-store nodeJS services (server and worker) locally, by default from port 3000.  You can use the same backing stores from within `docker-compose.yml` (Mongo, Redis, Elastic Search and Rabbit MQ).

When running in "isolated mode", each service include a `expose:` directive, eg:

```
  expose:
  - "27017"
```

when exposing the same port to the localhost, use `ports` instead:

```
  ports:
  - "27017:27017"
```

### Local Installation

clone this repo

```
% git clone ...
% cd $_
```
`cp sample-launch.json ./vscode/launch.json` for VSCode launcher configs

run `npm install` to load local dependencies

`npm test` to run Mocha/Supertest API tests
`npm start` or `./bin/www` to run server API locally

make sure to add the following line to your local `/etc/hosts` file:
`127.0.0.1       non-existent-tenant.domain.local joe.domain.local fred.domain.local test-tenant.domain.local barney.domain.local` for tests to pass

I will update the tests to use xip.io in the future perhaps ...

See `sample.env` for available ENV overrides.

Running `docker-compose build truth` will build a local Docker-image.

Running `npm run worker` or `node queue-worker.js` will start the Rabbit MQ consumer worker, which handles object mutation notifications.

Try to keep in mind that if you have the `truth-worker` running in Docker AND running it locally, you may or may not be debugging the same consumer that receives all messages ...

## Theory of Operation

This purpose of this platform is to serve as a "reactive truth database".  With an API, you can create a new Tenant, which is an isolated DB (namespace within a DB) for a client or client application.  From there you can add "Entities" (aka Custom Object Types), for things that client needs to keep track of (arbitrary number of Entities possible, but meant for non-PII/PCI things like Products, Categories, Hotels, Vacations, ...).  For each Entity, you can add any number of "Instances".

I also added in the idea of "Contexts", which aggregates graphs of related instances into a single response, and "Templates", which enable rendering arbitrary content-types, using Handlebars and any "Instance" or "Context" as the rendering context.  This allows for generation of any Content-Type, eg. XML, HTML, JSON (schema changes), JSX, ...

This platform uses MongoDB for it's underlying data store, but the implementation details are hidden in `lib/db.js`.  This means that, should we decide in the fute, to replace MongoDB with something else, we can.

Because all DB interations are in a single file, it also makes it easy to make future changes (like posting every object mutation as an event to a MQ or later conversion to _eventually consistent_ mode).

Express middleware handles basic token auth routines, as well as placing `client` and `db` properties on the `req` object, for everything in `routes/[entities|instances|contexts|templates].js`.  `routes/tenants.js` is a special case that deals directly with the administration of the platform, so it uses it's own Express middleware for auth and db access.

By the time the middleware is completed, the Tenant scope is defined (isolation + auth) and entity is loaded (schema + metadata) and the instance itself, of whatever type.  (Tenant, Entity, Instance, Template, Context, etc are all really just "Tenant-specific Entity Instances").

### Example API calls:

#### Tenants API:
`http://global.domain.local/objects/v1/tenants/v1` === all "tenants" objects from "global" namespace

#### Entities API:
`http://joe.domain.local/entities/v1/products` === one "products" entity from "joe" namespace

#### Instances API:
`http://joe.domain.local/objects/v1/products` === all "products" objects from "joe" namespace

`http://joe.domain.local/objects/v1/products/product-123` === one "products" object from "joe" namespace

#### Contexts API
`http://joe.domain.local/contexts/v1` === all contexts from "joe" namespace

`http://joe.domain.local/contexts/v1/product-details` === defines dynamic bindings for "product-details" context from "joe" namespace

`http://joe.domain.local/contexts/product-details/render?pid=product-123&category=mens-suits&recommended=product1,product2,product3` === one dynamic object graph (mixed entities) of all information needed to render "product-details" context from "joe" namespace

#### Templates API
`http://joe.domain.local/templates/v1` === all templates from "joe" namespace

`http://joe.domain.local/templates/v1/catalog-xml` === defines dynamic template "catalog-xml" from "joe" namespace (Handlebars template + content-type)

`http://joe.domain.local/templates/v1/catalog-xml/render/products/product-123` === dynamic rendering 'catalog-xml' template with "products/product-123" instance context from "joe" namespace

`http://joe.domain.local/templates/v1/catalog-xml/render/contexts/product-details?pid=product-123&category=mens-suits&recommended=product1,product2,product3` === dynamic rendering 'catalog-xml' template with dynamic context "product-details" object graph as context from "joe" namespace (and returned with content-type='text/xml')

### Design Decisions

API responses and API error responses all include the same style metadata, to make interactions as consistent as possible.

All API endpoints are fully asynchronous in nature and use ES6 async/await and try/catch/finally constructs.

Decent test coverage for API endpoints is provided, using Mocha and Supertest.

## REST APIs

Tenants API - Provision a client namespace
-
```
GET     /tenants/v1             Show all Tenants
GET     /tenants/v1/:tenantId   Show Tenant details
POST    /tenants/v1/:tenantId   Create/Replace Tenant (and accessToken)
PATCH   /tenants/v1/:tenantId   Update Tenant
PUT     /tenants/v1/:tenantId   Replace/Create Tenant
DELETE  /tenants/v1/:tenantId   Delete Tenant
```

Note: Read/write to 'global' DB, tenants Collection, w/ special token, as `token` query param or HTTP header `x-tenant-token`.


Entities API - Manage custom object types
-
```
GET     /entities/v1             List all Entities
GET     /entities/v1/:entityId   Find one Entity
POST    /entities/v1/:entityId   Create new Entity
PATCH   /entities/v1/:entityId   Update an existing Entity
PUT     /entities/v1/:entityId   Create/Replace a new/existing Entity
DELETE  /entities/v1/:entityId   Delete an existing Entity
```

Note: Read/write to 'tenant' DB, '_entities' collection, w/ tenant accessToken, as `token` query param or HTTP header `x-store-token`.


Instances API - Manage custom object instances
-
```
GET     /objects/v1/:entityId               List all Instances
GET     /objects/v1/:entityId/:instanceId   Find one Instance
POST    /objects/v1/:entityId/:instanceId   Create new Instance
PATCH   /objects/v1/:entityId/:instanceId   Update an existing Instance
PUT     /objects/v1/:entityId/:instanceId   Create/Replace a new/existing Instance
DELETE  /objects/v1/:entityId/:instanceId   Delete an existing Instance
```

Note: Read/write to 'tenant' DB, ':entityId' collection, w/ tenant accessToken, as `token` query param or HTTP header `x-store-token`.


Context API - Manage use case contexts
-
```
GET     /contexts/v1                    List all Contexts
GET     /contexts/v1/:contextId         Find one Instance
POST    /contexts/v1/:contextId         Create new Instance
PATCH   /contexts/v1/:contextId         Update an existing Instance
PUT     /contexts/v1/:contextId         Create/Replace a new/existing Instance
DELETE  /contexts/v1/:contextId         Delete an existing Instance

GET     /contexts/v1/:contextId/render  Render dynamic context
```

Templates API - Manage string-based templates
-
```
GET     /templates/v1                     List all Templates
GET     /templates/v1/:templateId         Find one Instance
POST    /templates/v1/:templateId         Create new Instance
PATCH   /templates/v1/:templateId         Update an existing Instance
PUT     /templates/v1/:templateId         Create/Replace a new/existing Instance
DELETE  /templates/v1/:templateId         Delete an existing Instance

GET     /templates/v1/:templateId/render/:entityId/:instanceId   Render dynamic template
```

Search API - Coming soon
-
```
GET     /search/v1             Search across all Entities/Indices
GET     /search/v1/:entityId   Search across one Entity

POST    /search/v1/:entityId   Create new Entity Index mapping
PATCH   /search/v1/:entityId   Update an existing Index Mapping
PUT     /search/v1/:entityId   Create/Replace a new/existing Index mapping
DELETE  /search/v1/:entityId   Delete an existing Index mapping

POST    /search/v1/:entityId/reindex              Re-index all object of type 'entityId'
POST    /search/v1/:entityId/:instanceId/reindex  Re-index a single object
```

## Internal API (lib/db.js)

Service API matches underlying Service Impl which has similar named tests.

ie. Entity API consists of routes/entities => lib/entities.js => test/routes/entities.js
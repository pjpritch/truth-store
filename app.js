// Copyright 2019 Peter Pritchard.  All rights reserved.

const express = require('express');
const path = require('path');
// const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const cache = require('./lib/cache');

// const sassMiddleware = require('node-sass-middleware');
const helpers = require('./lib/handlebars-helpers');
const { validateAccessToken } = require('./lib/middleware');
const { NotFoundError } = require('./lib/errors');
const { API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS } = require('./lib/constants');

const tenants = require('./routes/tenants');
const entities = require('./routes/entities');
const contexts = require('./routes/contexts');
const templates = require('./routes/templates');
const instances = require('./routes/instances');

const app = express();
const exphbs = require('express-handlebars');

// when configuring the app view engine
app.engine('hbs', exphbs({
  extname: '.hbs',
  helpers,
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

if (app.get('env') !== 'production') {
  app.set('json spaces', 2);
}

app.enable('trust proxy');

app.use(helmet());

const apiLimiter = rateLimit({
  store: new RedisStore({
    client: cache.getClient(),
  }),
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
});

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(sassMiddleware({
//   src: path.join(__dirname, 'public'),
//   dest: path.join(__dirname, 'public'),
//   indentedSyntax: true, // true = .sass and false = .scss
//   sourceMap: true
// }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/status', (req, res) => {
  // Add logic here
  res.json({ status: 'up' });
});

app.use('/tenants/v1', apiLimiter, tenants);

app.use('/entities/v1', apiLimiter, validateAccessToken, entities);
app.use('/templates/v1', apiLimiter, validateAccessToken, templates);
app.use('/contexts/v1', apiLimiter, validateAccessToken, contexts);
app.use('/objects/v1', apiLimiter, validateAccessToken, instances);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(new NotFoundError());
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

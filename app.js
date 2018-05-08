var express = require('express');
var path = require('path');
var favicon = require('serve-favicon'); // Node.js middleware for serving a favicon, a visual cue that client software, like browsers, use to identify a site.
var logger = require('morgan'); // HTTP request logger middleware for node.js
var session = require('express-session');
var config = require('config');

var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views')); // tells node where to find the .ejs files
app.set('view engine', 'ejs');
app.locals.title = 'Family Calendar';

// Allow the app to be run behind proxies. The app will detect when it's behind
// a proxy and properly configure https and other settings based on the user's
// connection to the proxy instead of the proxies connection to server.
// https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', true);

// Enable session storage. This defaults to using an in-memory store which is
// only designed for development environments. It will leak memory. Use a
// different storage adapter in production, such as redis.
// https://www.npmjs.com/package/express-session
//
// We use the session to store the FS access token and the current user data.
app.use(session({
  secret: 'calendar browser session secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: config.get('session.cookie.secure') }
}));

// Use morgan to log all incoming requests. Defaults to Apache style logs.
app.use(logger('dev'));

// Configure serving of static assets.
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

// Make the session available in templates and default to an empty object. If we
// don't default to an empty object then we would have to check for its
// existence before accessing data in templates.
app.use(function(req, res, next){
  res.locals.session = req.session || {};
  next();
});

// Attach routes
app.use('/', require('./routes/logged-out'));
app.use('/signin', require('./routes/signin'));
app.use('/signout', require('./routes/signout'));
app.use('/oauth-redirect', require('./routes/oauth-redirect'));
app.use('/calendar', require('./routes/calendar'));

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function(err, req, res, next) {

  // Set locals (template variables)
  // Only provide the error details in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

var express = require('express');
var router = express.Router();
var restError = require('../lib/rest-error');
var async = require('async');
var util = require('util');

// Setup the FS sdk client before handling any requests on this router.
router.use(require('../middleware/fs-client'));

// Make sure the user is signed in before handling any requests on this router.
router.use(require('../middleware/fs-session'));

router.get('/', function(req, res){
  res.render('calendar-options', {'userId': req.session.user.personId});
});

router.get('/calendar-options', function(req, res){
  res.render('calendar-options', {'userId': req.session.user.personId});
});

module.exports = router;
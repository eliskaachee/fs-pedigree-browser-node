var express = require('express');
var router = express.Router();
var restError = require('../lib/rest-error');
var async = require('async');
var util = require('util');
// Holds the calendar dates
var calendar = [
  {'monthName': 'January', dates:{}},
  {'monthName': 'February', dates:{}},
  {'monthName': 'March', dates:{}},
  {'monthName': 'April', dates:{}},
  {'monthName': 'May', dates:{}},
  {'monthName': 'June', dates:{}},
  {'monthName': 'July', dates:{}},
  {'monthName': 'August', dates:{}},
  {'monthName': 'September', dates:{}},
  {'monthName': 'October', dates:{}},
  {'monthName': 'November', dates:{}},
  {'monthName': 'December', dates:{}}
];

// Setup the FS sdk client before handling any requests on this router.
router.use(require('../middleware/fs-client'));

// Make sure the user is signed in before handling any requests on this router.
router.use(require('../middleware/fs-session'));

router.get('/', function(req, res){
  res.redirect('/calendar/' + req.session.user.personId);
});

function isValid(dateString) {
  
  var splitDateString = dateString.split(" ");
  if(!splitDateString[0] || !splitDateString[1] || !splitDateString[2]) {
    return false;
  }
  return true;
}
/**
Organizes the events by date and pushes them into the calendar, indexed by
day inside the proper month.
*/
function addEventToCalendar(name, date, ascendancyNumber, gender, type) {
  console.log(name + " " + date + " " + type);
  var eventDate = new Date(date);
  var eventInfo = {
    'name': name,
    'gender': gender,
    'ascendancyNumber': ascendancyNumber,
    'day': eventDate.getDate(),
    'month': eventDate.getMonth(),
    'year': eventDate.getFullYear(),
    'dayOfTheWeek': eventDate.getDay(), 
    'type': type
  };
  
  var dateString = ' ' + eventInfo.day;
  if(!calendar[eventDate.getMonth()].dates[dateString]) {
    calendar[eventDate.getMonth()].dates[dateString] = [];
    calendar[eventDate.getMonth()].dates[dateString].push(eventInfo);
  } else {
    // if there is already a marriage event in the calendar for their spouse
    if(type === "marriage") {
      for (var event in calendar[eventDate.getMonth()].dates[dateString]) {
        // if there is a match
        if ((Math.floor(calendar[eventDate.getMonth()].dates[dateString][event].ascendancyNumber / 2) === Math.floor(ascendancyNumber / 2)) && (calendar[eventDate.getMonth()].dates[dateString][event].type === "marriage")){
          calendar[eventDate.getMonth()].dates[dateString][event].name += (" and " + name);
        } else {
          calendar[eventDate.getMonth()].dates[dateString].push(eventInfo);
        }
      }
    } else { // it is a birth or death event
      calendar[eventDate.getMonth()].dates[dateString].push(eventInfo);
    }
  }
}

router.get('/:personId', function(req, res, next) {

  var fs = req.fs,
      personId = req.params.personId;

  // manages dependancies between asyncronous tasks (results are name of task)
  async.autoInject({

    calendar: function(callback){
      fs.get('/platform/tree/ancestry?generations=3&person=' + personId + "&personDetails=true&marriageDetails=true", function(error, response){
        if(error || response.statusCode !== 200){
          return callback(error || restError(response));
        }
        response.data.persons.forEach(function(person) {
          //Get birth date
          if(person.display.birthDate) {
            if(isValid(person.display.birthDate)) {
              addEventToCalendar(person.display.name, person.display.birthDate, person.display.ascendancyNumber, person.display.gender, "birth");
          }
          }
          //Get marriage date
          if(person.display.marriageDate) {
            if(isValid(person.display.marriageDate)) {
              addEventToCalendar(person.display.name, person.display.marriageDate, person.display.ascendancyNumber, person.display.gender, "marriage");
            }
          }
          //Get death date
          if(person.display.deathDate) {
            if(isValid(person.display.deathDate)) {
              addEventToCalendar(person.display.name, person.display.deathDate, person.display.ascendancyNumber, person.display.gender, "death");
            }
          }
        })
        console.log("Calendar: ", JSON.stringify(calendar, null, 4));
        // Notify async.autoInject that we're done with this task and give it
        // the ancestry data so that the data is available for later tasks.
        callback(null, calendar);
      });
    }
  }, function(error, results){
    if(error){
      next(error);
    } else {
      res.render('calendar', {'calendar': results.calendar});
    }
  });
});

module.exports = router;

var express = require('express');
var router = express.Router();
var restError = require('../lib/rest-error');
var async = require('async');
var util = require('util');
// Holds the calendar dates
var calendar;

// Setup the FS sdk client before handling any requests on this router.
router.use(require('../middleware/fs-client'));

// Make sure the user is signed in before handling any requests on this router.
router.use(require('../middleware/fs-session'));

router.get('/', function(req, res){
  res.redirect('/calendar/' + req.session.user.personId);
});

/**
* Creates the basic calendar object and calculates the number of days in the month
* and the offset of the first day of the month. The "date" array is filled in later. 
**/
function setUpCalendar() {
  calendar = [
    {'monthName': 'January',   'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'February',  'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'March',     'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'April',     'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'May',       'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'June',      'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'July',      'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'August',    'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'September', 'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'October',   'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'November',  'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}},
    {'monthName': 'December',  'numDaysInMonth': 0, 'firstDayOfMonth': 0, dates :{}}
  ];
  for(month in calendar) {
    var date = new Date();
    var currentMonth = Number(month);
    var year = date.getFullYear();
    var numDaysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    var firstDayOfMonth = new Date(year, currentMonth, 1).getDay();
    calendar[month].numDaysInMonth = numDaysInMonth;
    calendar[month].firstDayOfMonth = firstDayOfMonth;
  }
}

/**
* Determines if the date has a day, month, and year. Without this, the default
* value is used, and the calendar prints out wrong. If the date is not valid,
* the event is not displayed in the calendar.
**/
function isValid(dateString) {
  var splitDateString = dateString.split(" ");
  if(!splitDateString[0] || !splitDateString[1] || !splitDateString[2]) {
    return false;
  }
  return true;
}

/**
* Organizes the events by date and pushes them into the calendar, indexed by
* day inside the proper month.
* It also handles marriage events by preventing the event from being printed twice
**/
function addEventToCalendar(name, date, ascendancyNumber, gender, type) {
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
  
  var dayString = ' ' + eventInfo.day;
  // if there is not already a date 
  if(!calendar[eventDate.getMonth()].dates[dayString]) {
    calendar[eventDate.getMonth()].dates[dayString] = [];
    calendar[eventDate.getMonth()].dates[dayString].push(eventInfo);
  } else {
    // if there is already a marriage event in the calendar for their spouse
    if(type === "marriage") {
      for (var event in calendar[eventDate.getMonth()].dates[dayString]) {
        // if there is a match
        if ((Math.floor(calendar[eventDate.getMonth()].dates[dayString][event].ascendancyNumber / 2) === Math.floor(ascendancyNumber / 2)) && (calendar[eventDate.getMonth()].dates[dayString][event].type === "marriage")){
          calendar[eventDate.getMonth()].dates[dayString][event].name += (" and " + name);
        } else { // it is a marriage event that is not in the calendar yet
          calendar[eventDate.getMonth()].dates[dayString].push(eventInfo);
        }
      }
    } else { // it is a birth or death event
      calendar[eventDate.getMonth()].dates[dayString].push(eventInfo);
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
        setUpCalendar();
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
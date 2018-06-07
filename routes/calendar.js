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
  var displayHolidays = true;
  if(displayHolidays) {
    // The year could be anything, but it looks for a three part year, so something has to be there
    addEventToCalendar("New Year's Day", "1 January 0000", null, null, "holiday");
    addEventToCalendar("Independence Day", "4 July 0000", null, null, "holiday");
    addEventToCalendar("Veterans Day", "11 November 0000", null, null, "holiday");
    // TODO: Calculate Thanksgiving Day, Memorial Day, Father's Day, and Mother's Day
    // addEventToCalendar("Thanksgiving Day", thanksgivingDay + " November 0000", null, null, "holiday");
    addEventToCalendar("Christmas Eve", "24 December 0000", null, null, "holiday");
    addEventToCalendar("Christmas Day", "25 December 0000", null, null, "holiday");
  }
}

function addChurchHistoryEvents() {
  var displayChurchHistoryDates = true;
  if(displayChurchHistoryDates) {
    addEventToCalendar("Joseph Smith was born",                     "23 December 1805",  null, null, "church-history");
    addEventToCalendar("Joseph Smith is visited by Moroni",         "21 September 1823", null, null, "church-history");
    addEventToCalendar("Joseph Smith married Emma Hale",            "18 January 1827",   null, null, "church-history");
    addEventToCalendar("Joseph Smith received the Golden Plates",   "22 September 1827", null, null, "church-history");
    addEventToCalendar("Aaronic Priesthood Restored",               "15 May 1829",       null, null, "church-history");
    addEventToCalendar("First publication of the Book of Mormon",   "26 March 1830",     null, null, "church-history");
    addEventToCalendar("The Church was organized",                  "6 April 1830",      null, null, "church-history");
    addEventToCalendar("The Kirtland Temple was dedicated",         "27 March 1836",     null, null, "church-history");
    addEventToCalendar("Sealing Keys restored in Kirtland Temple",  "3 April 1836",      null, null, "church-history");
    addEventToCalendar("Doctrine of baptism for the dead revealed", "15 August 1840",    null, null, "church-history");
    addEventToCalendar("Relief Society Organized",                  "17 March 1842",     null, null, "church-history");
    addEventToCalendar("Martyrdom of Joseph and Hyrum Smith",       "27 June 1844",      null, null, "church-history");
    addEventToCalendar("Brigham Young arrives in Salt Lake Valley", "24 July 1847",      null, null, "church-history");
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
        addChurchHistoryEvents();
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
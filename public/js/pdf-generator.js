/**
* helper function for GENERATE(). Retrieves a page from the calendar
* based on the PAGE INDEX passed in. 
**/
function grabPage(pageIndex) {
  return new Promise(function(resolve, reject) {
    var newPage;
    html2canvas(document.getElementsByClassName('page')[pageIndex], {
      onrendered: function(canvas) {
        newPage = canvas.toDataURL('image/jpeg', 1.0);
        if (newPage == undefined) {
          console.log("There was an error retrieving a calendar page");
          reject();
        } else {
          resolve(newPage);
        }
      }
    });
  });
}

/**
* generates a PDF file using jsPDF, and loads them asyncronously using javascript
* promises. The final PDF is saved in the user's downloads.
**/
function generate() {
  document.getElementsByClassName('overlay-message')[0].innerHTML = "Downloading . . .";
  // creates a promise for each calendar page, so they can load asyncronously and the pages stay in the same order.
  var calendarPagePromiseArray = [grabPage(0),  grabPage(1),  grabPage(2),  grabPage(3), 
                                  grabPage(4),  grabPage(5),  grabPage(6),  grabPage(7), 
                                  grabPage(8),  grabPage(9),  grabPage(10), grabPage(11), 
                                  grabPage(12), grabPage(13), grabPage(14), grabPage(15), 
                                  grabPage(16), grabPage(17), grabPage(18), grabPage(19), 
                                  grabPage(20), grabPage(21), grabPage(22), grabPage(23), 
                                  grabPage(24), grabPage(25)];
  Promise.all(calendarPagePromiseArray).then(
    //if successful
    function(pageArray) {
      var pdf = new jsPDF('landscape', 'mm', 'a4');
      for(var i = 0; i < pageArray.length; i++) {
        console.log("page: " + i);
        pdf.addImage(pageArray[i], 'JPEG', 0, 0, 300, pdf.internal.pageSize.height);
        if(i < pageArray.length - 1) {
          pdf.addPage();
        }
      }
      pdf.save("myFamilyCalendar.pdf");
      document.getElementsByClassName('overlay-message')[0].innerHTML = "Done!";
    },
    // if not successful
    function(errorArray) {
      console.log("There was an error retrieveing your calendar");
    }
  ) // end of .then
}
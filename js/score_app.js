
/***** OLD CODE *****/
var columns = Array();

function showResult(json) {
  var entry = json.feed.entry[0];
  for (var j in entry) {
    var prefix = j.split("$")[0];
    var column = j.split("$")[1];
    if(prefix=="gsx") {
    columns.push(column);
    }
  }

  var t = document.getElementById("dataTBODY");
  var th = document.createElement("tr");
  // write out table header
  var td = document.createElement("td");
  var txt = document.createTextNode(" ");
  td.style.backgroundColor = "DDDDDD";
  td.style.fontWeight = "bold";

  td.appendChild(txt);
  th.appendChild(td);
  for (var i=0; i<columns.length; i++){
     var td = document.createElement("td");
     var txt = document.createTextNode(columns[i]);
     td.style.backgroundColor = "#DDDDDD";
     td.style.fontWeight = "bold";
     td.appendChild(txt);
     th.appendChild(td);
  }
  t.appendChild(th);

  // write out data rows
  var dString = "";
  for (var i = 0; i < json.feed.entry.length; i++) {
    var tr = document.createElement("tr");
    var entry = json.feed.entry[i];
    var td = document.createElement("td");
    var txt = document.createTextNode(i+1);
    td.style.backgroundColor = "#EEEEEE";
    td.appendChild(txt);
    tr.appendChild(td);

    for (var j=0; j<columns.length; j++){
      eval("var cString = entry.gsx$"+columns[j]+".$t");
      var td = document.createElement("td");
      var txt = document.createTextNode(cString);
      td.appendChild(txt);
      tr.appendChild(td);
    }
   t.appendChild(tr);
   // if we just reported 3rd row and table has more than 5 rows
   if(i==2 && json.feed.entry.length >5) {
      i=json.feed.entry.length-2;
      var tr = document.createElement("tr");
      var entry = json.feed.entry[i];
      for (var j=0; j<columns.length+1; j++){
    var cString = "...";
        var td = document.createElement("td");
        var txt = document.createTextNode(cString);
    if(j==0) td.style.backgroundColor = "#EEEEEE";
        td.appendChild(txt);
        tr.appendChild(td);
      }
      t.appendChild(tr);
   }
  }

}


$(document).ready(function () {
      // Retrieve the JSON feed.
    var script = document.createElement('script');

    script.setAttribute('src', 'http://spreadsheets.google.com/feeds/list'
                         + '/' + google_calc_id
                         + '/' + google_spreadcheet_id + '/public/values' +
                        '?alt=json-in-script&callback=showResult');

    script.setAttribute('id', 'jsonScript');
    script.setAttribute('type', 'text/javascript');

    $('head').append(script);
});

/***** OLD CODE END *****/


function OneWinnerNoFinal(data) {
    $('div#book-list').append('<ul class="items"></ul>');
    $.each(data.feed.entry, function(i,entry) {
        var item = '<span style="display:none">' + entry.id.$t + '</span>';
        item += '<img src="http://covers.openlibrary.org/b/isbn/' + entry.gsx$isbn.$t + '-S.jpg"/>';
        item += '<span class="meta"><a href="http://www.worldcat.org/isbn/' + entry.gsx$isbn.$t + '">' +
        entry.title.$t + '</a>';
        item += '<br/>Author: ' + entry.gsx$author.$t;
        if (entry.gsx$notes.$t) {
            item += '<br/>Description: ' + entry.gsx$notes.$t;
        }
        $('.items').append('<li>' + item + '</span></li>');
        });
    }


//The array of array that have the raw data of the score table
var score = new Array();
var last_update_time = 0;
var table;
//Has the data been updated?
var updated = false;

var group_filter='all';
var group_list = new Array();

//Note: Google remove upper case, : and space
var google_calc_columns = ['grupp','lag',
    'hoppa',  'hoppb',  'hoppc',  'hoppd',  'hopptotalt',
    'mattaa', 'mattab', 'mattac', 'mattad', 'mattatotalt',
    'golva',  'golvb',  'golvc',  'golvd',  'golvtotalt',
    'totalt']; //If this isn't 18 items, sorting need to be updated

var google_calc_team_column = 'lag';

//Fields from google_calc_columns, start from 1. 0 is position
var google_calc_default_view = [0,2,18];

var get_google_calc = function() {
   // This function get the google spreadsheat
   $.getJSON( 'http://spreadsheets.google.com/feeds/list'
         + '/' + google_calc_id
         + '/' + google_spreadcheet_id + '/public/values' +
        '?alt=json-in-script&callback=?',
    google_calc_to_array);
};

var showAsFloat = function(n){
    return !Number(n) ? n : Number(n)%1 === 0 ? Number(n).toFixed(2) : n;
}

var google_calc_to_array = function(json) {
    //This function read the goolge calc json respond and convert it to js
    // arrays

    var tmp_score=new Array();
    if (last_update_time != json.feed.updated.$t) {
        //When did the calc update last time
        last_update_time = json.feed.updated.$t;

        //Tell that we need to update the view
        updated = true;

        //Reset group_list
        group_list = new Array();

        //Loop throught all lines
        $.each(json.feed.entry, function(i,entry) {
            var line = [0]; //First field is always position

            if (entry['gsx$grupp'].$t != "") {
                //Add all non empty groups
                group_list.push(entry['gsx$grupp'].$t);
            }

            if (entry['gsx$'+google_calc_team_column].$t != "") {
                //Only add rows that have team names in them
                $.each(google_calc_columns,function(i,field) {

                    line.push(showAsFloat(entry['gsx$'+field].$t.replace(',','.')));
                });
                tmp_score.push(line);
            }

        });

        //Get values in array uniqe
        group_list = $.grep(group_list, function(v, k){
            return $.inArray(v ,group_list) === k;
        });
        add_group_filter();
        //Calc position depending on contest type
        score = calc_position(tmp_score, contest_type);
    }
    if (! table) {
        //First time add the table
        table = array_to_table(score).show();
        $('.score').append(table);
    }
};

var sortingFuncs = {
    number: function(i, j){
        return i - j;
    },
    string: function(i, j){
        return (i > j) ? 1 : (i == j) ? 0 : -1;
    }
};

var calc_position = function(array, contest_type) {
    // This will calculate the position and change the first field to the
    // right number
    // TODO: Add contest type so we can calculate on the right way.

    var sortingFunc = sortingFuncs.number;
    if (contest_type == 'OneWinnerNoFinal') {
        //sort the output..
        array.sort(function(i, j){
            field_i = i[18];
            field_j = j[18];
            //return (ascending) ? sortingFunc(i,j) : 0-sortingFunc(i,j);
            return -sortingFunc(field_i,field_j);
        });
        $.each(array, function(i, line) {
            //arrays start with 0 and we need to display from 1
            line[0]=i+1;
        });
    } else {
        alert('Okänd tävlingform, fix!');
    }

    return array;
}

var array_to_table = function(array) {
    //Convert an array to an html table
    var table =  $('.template').clone();
    table.removeClass('template');
    table.addClass('score');
    var tBody = $(table[0].tBodies[0]);

    $.each(array, function(i, line){

        if ( group_filter == 'all'  ||
             group_filter == line[1] ) {
             //If group_filer is defined use it or else all

            var row = $('<tr/>');

            $.each(google_calc_default_view, function(j, value){
                var cell = $('<td />', {
                    text: line[value],
                    css: {
                        textAlign: 'left',
                    }
                });
                if (value == 2) {
                    var details = $('<div/>', {
                        class: 'popup',
                        html: "<span class='bClose'><span>X</span></span>\n" +
                        "<b>" + line[2] + "</b>" +
                        "<table class='score'><thead>" +
                        "<tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th><th>Total</th></tr>" +
                        "</thead><tbody>" +
                        "<tr>" +
                        "<th>Hopp</th><td>" + line[3] +
                        "</td><td>" + line[4] +
                        "</td><td>" + line[5] +
                        "</td><td>" + line[6] +
                        "</td><td>" + line[7] +
                        "</td></tr>" +
                        "<tr>" +
                        "<th>Matta</th><td>" + line[8] +
                        "</td><td>" + line[9] +
                        "</td><td>" + line[10] +
                        "</td><td>" + line[11] +
                        "</td><td>" + line[12] +
                        "</td></tr>" +
                        "<tr>" +
                        "<th>Golv</th><td>" + line[13] +
                        "</td><td>" + line[14] +
                        "</td><td>" + line[15] +
                        "</td><td>" + line[16] +
                        "</td><td>" + line[17] +
                        "</td></tr>" +
                        "</table>"
                    });
                    cell.append(details);
                    cell.on('click',function(e) {
                        e.preventDefault();
                        details.bPopup({
                            fadeSpeed: 'fast', //can be a string ('slow'/'fast') or int
                            follow: [false,false],
                            modalColor: '#b9c9fe',
                            positionStyle: 'fixed'
                            });
                    });
                }
                row.append(cell);
            });
            tBody.append(row);
        }
    });
    return table;
};

var update_table = function() {
    //Process the array to an html table and apply needed extra data.
    get_google_calc();
    if (updated) {
        updated = false;
        var newTable = array_to_table(score);
        table.rankingTableUpdate(newTable, {
            duration: [1000,200,700,200,1000],
            onComplete: function(){
                updated = false;
            },
            animationSettings: {
                up: {
                    left: 0,
                    backgroundColor: '#CCFFCC'
                },
                down: {
                    left: 0,
                    backgroundColor: '#FFCCCC'
                },
                fresh: {
                    left: 0,
                    backgroundColor: '#CCFFCC'
                },
                drop: {
                    left: 0,
                    backgroundColor: '#FFCCCC'
                }
            }
        });
        table = newTable;
         $('#status').html("Senast uppdaterad " + last_update_time);
    }
}

var add_group_filter = function() {
    //Add filter on group
    var select = $('<select/>',
        {id: 'group_list_value',
        onChange: 'set_group_filter();' });
    var option = $('<option/>',{value: 'all', text: 'Alla'});
    select.append(option);

    $.each(group_list, function(i, value){
        var option = $('<option/>',{value: value, text: value});
        select.append(option);
    });
    $('#option').append('Välj grupp: ');
    $('#option').html(select);
}

var set_group_filter = function() {
    //Set and update filter
    group_filter=$("#group_list_value").val();
    if(group_filter != 'all') {
        $('#head').html("Grupp: " + group_filter);
    } else {
        $('#head').html("Alla lag");
    }
    updated=true;
    update_table();

}
$(document).ready(function() {
    get_google_calc();
    setInterval(update_table, 10000);
});


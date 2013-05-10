
//The array of array that have the raw data of the score table
var score = new Array();
var last_update_time = 0;
var table;
//Has the data been updated?
var updated = false;
var last_updated = 0;
//Filter on groups
var group_filter='all';
var group_list = new Array();

//Update interval
var update_interval = 180000; //Default every 3:e minute
var interval_timer = 0; //So we can stop and restart the timer

//my_favo team - just high light them in the list
var my_favo = ""
var my_favo_list = new Array();

//Note: Google remove upper case, : and space
var google_calc_columns = ['grupp','lag',
    'hoppa',  'hoppb',  'hoppc',  'hoppd',  'hopptotalt',
    'mattaa', 'mattab', 'mattac', 'mattad', 'mattatotalt',
    'golva',  'golvb',  'golvc',  'golvd',  'golvtotalt',
    'totalt']; //If this isn't 18 items, sorting need to be updated

var google_calc_team_column = 'lag';

//Fields from google_calc_columns, start from 1. 0 is position
var google_calc_default_view = [0,2,18];

var notification_error = false;
var get_google_calc_error = false;


var setCookie = function (c_name,value,exdays) {
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=c_name + "=" + c_value;

}

var getCookie = function(c_name) {
    var c_value = document.cookie;
    var c_start = c_value.indexOf(" " + c_name + "=");
    if (c_start == -1) {
        c_start = c_value.indexOf(c_name + "=");
    }
    if (c_start == -1) {
        c_value = null;
    } else {
        c_start = c_value.indexOf("=", c_start) + 1;
        var c_end = c_value.indexOf(";", c_start);
        if (c_end == -1) {
            c_end = c_value.length;
        }
        c_value = unescape(c_value.substring(c_start,c_end));
    }

    return c_value;
}

var get_my_favo = function() {

    if (my_favo == "") {
        //my_favo not set, check cookie
       my_favo=getCookie('my_favo'); 
    } 

    return my_favo;
}

var set_my_favo = function() {
    //Set my favo team
    my_favo = $("#my_favo").val();
    setCookie('my_favo', my_favo,'2');
    last_update_time="";
    clearInterval(interval_timer);
    update_table();

}

var update_favo_list = function(list) {
    //Update the favo_list dropdown
    var select = $('<select/>',
        {id: 'my_favo',
        onChange: 'set_my_favo();' });
    var option = $('<option/>',{value: '', text: 'Välj lag'});
    select.append(option);

    var local_my_favo = get_my_favo();
    $.each(my_favo_list, function(i, value) {
        //Select prev selected when regenerate list.
        if (local_my_favo == value) {
            var option = $('<option/>',{selected: true, value: value, text: value});
            select.append(option);
        } else {
            var option = $('<option/>',{value: value, text: value});
            select.append(option);
        }
    });
    $('#my_favo_box').html(select);


}

var hide_notification = function(html) {
    show_notification(html);

    if (! notification_error) {
        setTimeout(function(){$('#notification').fadeOut('slow')}, 1000);
    }
}

var show_notification= function(html, error){
    if (error) { 
        notification_error = true;
        html += '<form><button onClick="return update_table();">Prova igen</button></form>';
        $('#notification').height('3em');

    } else {
        notification_error = false;
        $('#notification').height('1em');
        
    }

    $('#notification').html(html);
    $('#notification').fadeIn();

    $('.popup_notification').html(html);
    $('.popup_notification').fadeIn();
}

//If less then 3 decimals always return 2 else 3
var showAsFloat = function(n){
    if (isNaN(n)) {
        return n
    } else {
        n2 = parseFloat(Math.round(n * 100));
        n3 = parseFloat(Math.round(n * 1000));
        return n3%10 == 0 ? (n2 / 100).toFixed(2)  : (n3 / 1000).toFixed(3); 
    }
}

var update_last_modified = function(timestamp) {
    modify_date = new Date();
    modify_date.setISO8601(timestamp);
    $('.status').html("Senast ändrat: " +
        modify_date.toLocaleDateString() + " " +
        modify_date.toLocaleTimeString());
}

$.ajaxSetup( { "async": false } );

//This function will start the call-back chain
var get_google_calc = function() {

    show_notification('Hämtar...');
   // This function get the google spreadsheat
   $.getJSON( 'http://spreadsheets.google.com/feeds/list'
         + '/' + google_calc_id
         + '/' + google_spreadcheet_id + '/public/values' +
        '?alt=json-in-script&callback=?',
        function(json) {
            get_google_calc_error = false;
            google_calc_to_array(json);
        })
   .fail(function() { 
        get_google_calc_error = true;
        show_notification('Hämtning misslyckades', error=true); 
    });
};

// First step in the call-back-chain (if success in finding the document)
var google_calc_to_array = function(json) {
    //This function read the goolge calc json respond and convert it to js
    // arrays
    if (! table) {
        show_notification('Skapar resultat listan')
    } else {
        show_notification('Uppdaterar...');
    }
    var tmp_score=new Array();
    if (last_update_time != json.feed.updated.$t) {
        //When did the calc update last time
        last_update_time = json.feed.updated.$t;

        //Tell that we need to update the view
        updated = true;

        //Reset group_list
        group_list = new Array();

        //Reset favo list
        my_favo_list = new Array();

        //Loop throught all lines
        $.each(json.feed.entry, function(i,entry) {
            var line = [0]; //First field is always position

            if (entry['gsx$grupp'].$t != "") {
                //Add all non empty groups
                group_list.push(entry['gsx$grupp'].$t);
            }

            if (entry['gsx$'+google_calc_team_column].$t != "") {
                //Only add rows that have team names in them

                //Add all team to favo list
                my_favo_list.push(entry['gsx$'+google_calc_team_column].$t);

                 if (contest_type == 'OneWinnerWithFinal') {
                    if (group_filter != 'Final' && entry['gsx$grupp'].$t != 'Final') {
                        $.each(google_calc_columns,function(i,field) {
                            line.push(showAsFloat(entry['gsx$'+field].$t.replace(',','.')));
                        });
                        tmp_score.push(line);

                    } else if (group_filter == 'Final' && entry['gsx$grupp'].$t == 'Final'){
                        $.each(google_calc_columns,function(i,field) {
                            line.push(showAsFloat(entry['gsx$'+field].$t.replace(',','.')));
                        });
                        tmp_score.push(line);
                    }

                } else {
                    $.each(google_calc_columns,function(i,field) {
                        line.push(showAsFloat(entry['gsx$'+field].$t.replace(',','.')));
                    });
                    tmp_score.push(line);
            
                }

            }

        });

        //Get values in array uniqe
        group_list = $.grep(group_list, function(v, k){
            return $.inArray(v ,group_list) === k;
        });
        group_list.sort();
        add_group_filter();

        //Get values in favo_list uniqe
        my_favo_list = $.grep(my_favo_list, function(v,k) {
            return $.inArray(v ,my_favo_list) === k;
        });
        my_favo_list.sort();
        update_favo_list();

        //Calc position depending on contest type
        score = calc_position(tmp_score, contest_type);
    }
    if (! table) {
        //First time add the table
        table = array_to_table(score).fadeIn();
        $('.score').append(table);

        update_last_modified(last_update_time)   
        hide_notification('Visar resultatet');
        $('#option').fadeIn('slow');
        //Reset updated timer as its the first time
        updated = false;

    } else {
        //If there are an update to the table, 
        //lets call the last step in the call-back chain
        show_updated_table()
        update_last_modified(last_update_time)

    }

    //The last update
    last_updated = new Date().getTime()
};


//Last step in call-back chain (An update in the table)
var show_updated_table = function() {

    if (updated) {
        show_notification('Nytt resultat...');
        updated = false;
        var newTable = array_to_table(score);
        table.rankingTableUpdate(newTable, {
            duration: 3000,
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
                    backgroundColor: '#e8edff'
                },
                drop: {
                    left: 0,
                    backgroundColor: '#ffffff'
                }
            }
        });
        table = newTable;

        hide_notification('Listan uppdaterad');
    } else {
        hide_notification('Inget att uppdatera');
    }
}



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

    var sortingFunc = sortingFuncs.number;
    var pre_score = 0;
    var pre_pos = 0;
    var current_pos = 1;

    if (contest_type == 'OneWinnerNoFinal' ) {
        //sort the output..
        array.sort(function(i, j){
            field_i = i[18];
            field_j = j[18];
            //return (ascending) ? sortingFunc(i,j) : 0-sortingFunc(i,j);
            return -sortingFunc(field_i,field_j);
        });

        $.each(array, function(i, line) {
            if (pre_score != line[18]) {
                //Different score 
                pre_score = line[18];
                line[0] = current_pos;
                pre_pos = current_pos;
            } else {
                //Same score
                line[0] = pre_pos;
            }
        });     
    } else if (contest_type == 'OneWinnerWithFinal') {
        //sort the output..
        array.sort(function(i, j){
            field_i = i[18];
            field_j = j[18];
            //return (ascending) ? sortingFunc(i,j) : 0-sortingFunc(i,j);
            return -sortingFunc(field_i,field_j);
        });

        $.each(array, function(i, line) {

            if (pre_score != line[18]) {
                //Different score 
                pre_score = line[18];
                line[0] = current_pos;
                pre_pos = current_pos;
            } else {
                //Same score
                line[0] = pre_pos;
            }
            current_pos = current_pos + 1;
        });     
    } else {
        alert('Okänd tävlingform, fix!');
    }

    return array;
}

//Makes a table row out of an google calc line
var line_to_row = function(line, favo) {
    var row = $('<tr/>');

    if (favo) {
        row.addClass('favo');
    }

    $.each(google_calc_default_view, function(j, value){
        var cell = $('<td />', {
            html: "<span class='row'>" + line[value] + "</span>",
            css: {
                textAlign: 'left',
            }
        });
        if (value == 2) {
            var details = $('<div/>', {
                class: 'popup',
                html: "<span class='bClose'><span>X</span></span>\n" +
                "<h2>" + line[1] + ": " + line[2] + "</h2>" +
                "<table class='detailed_score'><thead>" +
                "<tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th><th>Total</th></tr>" +
                "</thead><tbody>" +
                "<tr class='trampett'><th colspan='6'>Trampett</th></tr>" + 
                "<tr class='trampett'><td></td><td>" + line[3] +
                "</td><td>" + line[4] +
                "</td><td>" + line[5] +
                "</td><td>" + line[6] +
                "</td><td><b>" + line[7] +
                "</b></td></tr>" +
                "<tr class='tumbling'><th colspan='6'>Tumbling</th></tr>" + 
                "<tr class='tumbling'><td></td><td>" + line[8] +
                "</td><td>" + line[9] +
                "</td><td>" + line[10] +
                "</td><td>" + line[11] +
                "</td><td><b>" + line[12] +
                "</b></td></tr>" +
                "<tr class='fristande'><th colspan='6'>Fristående</th></tr>" + 
                "<tr class='fristande'><td></td><td>" + line[13] +
                "</td><td>" + line[14] +
                "</td><td>" + line[15] +
                "</td><td>" + line[16] +
                "</td><td><b>" + line[17] +
                "</b></td></tr>" +
                "</table>"
            });
            cell.append(details);
            cell.on('click',function(e) {
                e.preventDefault();
                details.bPopup({
                    fadeSpeed: 'fast', //can be a string ('slow'/'fast') or int
                    follow: [false, false],
                    modalColor: '#b9c9fe',
                    positionStyle: 'fixed',
                    amsl: 500,
                    });
            });
        }
        row.append(cell);
    });
    return row;    
}

var array_to_table = function(array) {
    //Convert an array to an html table
    var table =  $('.template').clone();
    table.removeClass('template');
    table.addClass('score');
    var tBody = $(table[0].tBodies[0]);

    $.each(array, function(i, line){

        if (contest_type == 'OneWinnerNoFinal') {
            if ( group_filter == 'all'  ||
                 group_filter == line[1] ) {
                 //If group_filer is defined use it or else all
                if (line[2] == get_my_favo()) {
                    tBody.append(line_to_row(line,true));
                } else {
                    tBody.append(line_to_row(line,false));
                }
            }
        } else if  (contest_type == 'OneWinnerWithFinal') {
            //Treat Final pool different so we get the cases:
            //all  == all exept Final
            //<named pool> == named pool
            //Final == only final (same as above)
            if ( (group_filter == 'all'  && line[1] != 'Final')||
                 group_filter == line[1] ) {

                if (line[2] == get_my_favo()) {
                    tBody.append(line_to_row(line,true));
                } else {
                    tBody.append(line_to_row(line,false));
                }
            }  
        }
    });
    return table;
};

var update_table = function() {
    //Process the array to an html table and apply needed extra data.
    show_notification('Kollar efter nya resultat...');
    get_google_calc();
    if (!get_google_calc_error) {
        interval_timer = setInterval(count_down_clock, 1000);
    }
    return false;
}

var add_group_filter = function() {
    //Add filter on group
    var select = $('<select/>',
        {id: 'group_list_value',
        onChange: 'set_group_filter();' });
    var option = $('<option/>',{value: 'all', text: 'Alla lag'});
    select.append(option);

    $.each(group_list, function(i, value) {
        //Select prev selected when regenerate list.
        if (value == group_filter) {
            var option = $('<option/>',{selected: true, value: value, text: value});
            select.append(option);
        } else {
            var option = $('<option/>',{value: value, text: value});
            select.append(option);
        }
    });
    $('.template .group_filter').html(select);
}

var set_group_filter = function() {
    //Set and update filter
    group_filter=$("#group_list_value").val();
    updated=true;
    last_update_time="";
    clearInterval(interval_timer);
    update_table();

}


//Countdown until next update
var count_down_clock = function() {

    var current_time = new Date().getTime();
    var diff = current_time - last_updated;
    if (diff >= update_interval) {
        //Clear the timer, update_table will start it again
        clearInterval(interval_timer);
        $(".next_update").html('kollar nu');
        update_table();
    } else {
        $(".next_update").html('kollar igen om '+ Math.round((update_interval - diff) / 1000) + 's');
    }
}

var set_update_interval = function() {
    update_interval=$("#update_time_value").val();
}


//http://delete.me.uk/2005/03/iso8601.html
Date.prototype.setISO8601 = function (string) {
    var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
        "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
        "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
    var d = string.match(new RegExp(regexp));

    var offset = 0;
    var date = new Date(d[1], 0, 1);

    if (d[3]) { date.setMonth(d[3] - 1); }
    if (d[5]) { date.setDate(d[5]); }
    if (d[7]) { date.setHours(d[7]); }
    if (d[8]) { date.setMinutes(d[8]); }
    if (d[10]) { date.setSeconds(d[10]); }
    if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
    if (d[14]) {
        offset = (Number(d[16]) * 60) + Number(d[17]);
        offset *= ((d[15] == '-') ? 1 : -1);
    }

    offset -= date.getTimezoneOffset();
    time = (Number(date) + (offset * 60 * 1000));
    this.setTime(Number(time));
}


$(document).ready(function() {
    $('#view_settings').on('click',function(e) {
        e.preventDefault();
        $("#settings_popup").bPopup({
            fadeSpeed: 'fast', //can be a string ('slow'/'fast') or int
            follow: [false, false],
            modalColor: '#b9c9fe',
            positionStyle: 'fixed',
            amsl: 500,
            });
    });
    $("#startup_popup").bPopup({
        fadeSpeed: 'fast', //can be a string ('slow'/'fast') or int
        follow: [false, false],
        modalColor: '#b9c9fe',
        positionStyle: 'fixed',
        amsl: 500,
        onOpen: function() { interval_timer = setInterval(count_down_clock, 1000); }, 
        });
});


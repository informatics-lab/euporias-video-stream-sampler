'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
const BELL_SERVER       = "https://ellhouse.eu.ngrok.io";
const HOME_PAGE         = 'index.html';                     //homepage
const TILE_TEMPLATE     = 'tile.html';                      //html tile template

var $               = require("jquery");
var startButton     = $('#start-config');
var homeButton      = $('#home-button');
var addButton       = $('#add-button');
var bellCount       = $('#bell-count');
var resetButton     = $('#reset-button');
var bellGrid        = $('#bell-grid');                      //html grid where tiles (representing bells) will be added
var template        = null;                                 //bell tile template (DOM object constructed from TILE_TEMPLATE)
var bellArray       = [];                                   //array of bells which should be in sync with server


initSetupPage();


/*load tile template and get bells config from server*/
function initSetupPage(){

    //get tile template from url
    getTileTemplate(TILE_TEMPLATE, function(result){
        template = result;

        //if no hats configured, set these up 
        hatsConfigured(function(result){
            if (result == false){
                console.log("No configuration found on bell server, so adding...");
                addHats(function(){
                    bellArray = getBellsFromServer(template)
                });
            }
            else {            
                bellArray = getBellsFromServer(template);
            }
            addToolbarBindings();
        });
    });   

    
}

function Bell(template, id, rotate_to_deg) { 
    this.template = template;               //bell tile template used to construct new bell tile
    this.id = id;                           //bell id 1 - 34
    this.hat = Math.floor(id/16);           //hat id (0 - 2)
    this.channel = id % 16;                 //channel id (0 - 15)
    this.init_deg = 0;                      //servo initial degrees
    this.rotate_to_deg = rotate_to_deg;     //servo rotate to degrees

    var thisBell = this;        //we need to keep a reference to this object - yuck!!!
    
    console.log("id: " + this.id + ", hat: " + this.hat + ", channel: " + this.channel);        
    
    //disable the bell tile on screen
    this.disable = function(){
        $(this.tile).find('*').prop('disabled', true);
    };
    //enable bell tile on screen
    this.enable = function(){
        $(this.tile).find('*').removeAttr('disabled');
    };
    //add this bell to server
    this.add = function(){
        this.disable();                 //disable tile
        addServo(this.id, this.hat, this.channel, this.init_deg, this.rotate_to_deg, function(){
            thisBell.enable();          //re-enable tile once successfully added on server
        });
    };
    //delete this bell from server and screen
    this.delete = function(){
        this.disable();                 //disable tile
        deleteServo(this.id, function(){
            thisBell.tile.remove();     //remove from screen once successfully deleted from server
        });
    };
    //update this bell with given rotate_to_deg value
    this.update = function(rotate_to_deg){
        this.disable();                 //disable tile
        updateServo(this.id, this.hat, this.channel, this.init_deg, this.rotate_to_deg, function(){
            thisBell.enable();          //re-enable tile once successfully updated on server
        });
    };
    //set strike angle
    this.setStrikeAngle = function(angle){
        this.rotate_to_deg = parseInt(angle);
        console.log("Strike angle updated to " + this.rotate_to_deg + " for bell " + id);       
    };
    //strike this bell
    this.strike = function(){
        moveServo(this.id);
        console.log("striking bell " + this.id);
    };      

    //create new bell tile from template, add to screen and keep a reference to the bell tile in the DOM
    var newTile = createNewTile(template, id, rotate_to_deg);
    bellGrid.append(newTile);
    this.tile = $("#bell-id" + this.id).parent();
    
    //add event listeners to buttons and controls
    var strikeAngle     =   $(this.tile).find("#strike-angle" + id);
    var updateButton    =   $(this.tile).find("#update-button" + id);
    var strikeButton    =   $(this.tile).find("#strike-button" + id);
    var deleteButton    =   $(this.tile).find("#delete-button" + id);        

    strikeAngle.bind('blur', function(evt){
        thisBell.setStrikeAngle(strikeAngle.val());  
    });
    updateButton.bind('click', function(evt){
        thisBell.update();
    });  
    strikeButton.bind('click', function(evt){
        thisBell.strike();
    });
    deleteButton.bind('click', function(evt){
        bellArray.splice(bellArray.indexOf(thisBell), 1);   //delete this bell from array
        thisBell.delete();                                  //now delete from screen
    });    
    
 };

//get tile template from specified url and callback
function getTileTemplate(url, callback){
    $.get(url)                                                                  //load html from specified url
    .done('response', function(html) {
        var template = document.createRange().createContextualFragment(html);    //create DOM object from html string
        callback(template);
    });
}

function addToolbarBindings(){
    homeButton.bind('click', function(evt){
        window.location.href=HOME_PAGE;
    });
    addButton.bind('click', function(evt){
        var newBells = parseInt(bellCount.val());
        var startIndex = bellArray.length > 0 ? bellArray[bellArray.length - 1].id + 1 : 0;     //if bells in list, use id of last bell in array + 1, else use 0
        var finishIndex = startIndex + newBells;
        for (var i = startIndex; i < finishIndex; i++) {
            var b = new Bell(template, i, 45);
            bellArray.push(b);              //add new bell to array
            b.add();                        //add bell to bell server
        }
    });
    resetButton.bind('click', function(evt){
        var bells = bellArray.length;
        for (var i = 0; i < bells; i++) {
            bellArray.pop().delete();       //remove bell from array and delete from screen
        }
    });
    startButton.bind('click', function(evt){
      console.log('start');
      loadConfig();
    });

  }


 //Create new DOM tile from template and given params 
function createNewTile(template, id, rotate_to_deg) {
    var newTile         =   template.cloneNode(true);
    var div             =   $(newTile).find("#bell-id");    
    var legend          =   $(newTile).find("legend");
    var strikeAngle     =   $(newTile).find("#strike-angle");
    var updateButton    =   $(newTile).find("#update-button");
    var deleteButton    =   $(newTile).find("#delete-button");
    var strikeButton    =   $(newTile).find("#strike-button");
    
    div.attr('id', div.attr('id') + id);                        //add id to bell div
    legend.text(legend.text() + " " + id);                      //update legend text
    strikeAngle.attr('id', strikeAngle.attr('id') + id);        //add id to strike angle input field
    strikeAngle.val(rotate_to_deg);                             //update rotate_to_deg value
    updateButton.attr('id', updateButton.attr('id') + id);      //add id to update button
    deleteButton.attr('id', deleteButton.attr('id') + id);      //add id to delete button    
    strikeButton.attr('id', strikeButton.attr('id') + id);      //add id to strike button

    return newTile;
};

//add all hats 
function addHats(callback){
    //add hats synchronously the callback
    addHat(0, "0x40", function(){
        addHat(1, "0x41", function(){
            addHat(2, "0x42", function(){
                callback();
            });
        });       
    });                     
}

//return true if hats configured, else return false and callback
function hatsConfigured(callback){
    var hats = 0;
    $.ajax({
        url: BELL_SERVER + '/hats',
        method: 'GET'
    }).done(function(response) {
        $.each(response, function(i, resultset){
            //iterate over each result and inc hat counter
            $.each(resultset, function(i, result){
                hats ++;
            });
        });
        callback(hats == 3);    //if exactly 3 hats, return true else return false
    });
}

//add hat with given id and address and callback
function addHat(id, address, callback) {
    var payload = {
            'id': id,
            'address': address
        }
    $.ajax({
        url: BELL_SERVER + '/hats',
        method: 'POST',
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(payload)
    }).then(function(response) {
        console.log("Added hat with id " + id + " and address " + address);
        callback();
    });
};

//add servo with given id, channel, init_deg and rotate_to_deg
function addServo(id, hat, channel, init_deg, rotate_to_deg, callback) {
    var payload = {
            'id': id,
            'hat': hat,
            'channel': channel,
            'init_deg': init_deg,
            'rotate_to_deg': rotate_to_deg
        }
    $.ajax({
        url: BELL_SERVER + '/servos',
        method: 'POST',
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(payload)
    }).then(function(response) {
        console.log("Added servo with id " + id);
        if (callback) callback();
    });
};

//delete servo with given id
function deleteServo(id, callback) {
    $.ajax({
        url: BELL_SERVER + '/servos/' + id,
        method: 'DELETE'
    }).then(function(response) {
        console.log("Deleted servo with id " + id);
        if (callback) callback();
    });
};

function updateServo(id, hat, channel, init_deg, rotate_to_deg, callback) {
    deleteServo(id, function(){
        addServo(id, hat, channel, init_deg, rotate_to_deg, function(){
            console.log("Updated servo with id " + id);                
            if (callback) callback();
        });
    });
};

 //move servo with given id
function moveServo(id) {
    var servoIdArray = "[" + id + "]";
    $.ajax({
        url: BELL_SERVER + '/strike',
        method: 'POST',
        dataType: "json",
        contentType: "application/json",     
        data: servoIdArray
    }).then(function(response) {
        console.log("Moved servo with id " + id);
    });
};


var confStarted = false;

function loadConfig() {
    $.ajax({
      url: BELL_SERVER + '/start',
      method: 'GET'
    }).done(function(response) {
      $.ajax({
        url: BELL_SERVER + '/loadconf',
        method: 'GET'
      }).done(function(response) {
        confStarted = true;
        console.log("loaded");
      })
    })
}

function getBellsFromServer(template) {
    var bells = [];  
    $.ajax({
        url: BELL_SERVER + '/servos',
        method: 'GET'
    }).done(function(response) {
        $.each(response, function(i, resultset){
            //sort results first, so bells are created in order of id
            var results = resultset.sort(function(a,b){ 
                return a.id - b.id;
            });
            //iterate over each result, create new bell instance and add to array
            $.each(results, function(i, result){
                bells[i] = new Bell(template, result.id, result.rotate_to_deg);
            });
            console.log("Fetched " + bells.length + " bells from server.");              
        });
    });
    return bells;
};







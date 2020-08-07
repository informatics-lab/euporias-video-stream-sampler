'use strict';
//const BELL_SERVER       = "http://bellhouse.eu.ngrok.io";
//const BELL_SERVER       = "http://192.168.1.156:5000";
//const BELL_SERVER       = "http://192.168.1.142:5000";
const TILE_TEMPLATE     = 'tile.html';                      //html tile template
var $               = require("jquery");
var request			= require('request');
var requestPromise	= require('request-promise-native');
var fs				= require('fs');
var d 		    	= new Date();
var addButton       = document.getElementById('add-button');
var resetButton     = document.getElementById('reset-button');
var startButton 	= document.getElementById('start-button');
var bhAddr		= ""
var bellCount       = $('#bell-count');
var bellGrid        = $('#bell-grid');                      //html grid where tiles (representing bells) will be added
var template        = null;                                 //bell tile template (DOM object constructed from TILE_TEMPLATE)
var bellArray       = [];                                   //array of bells which should be in sync with server


var settingAddr		= false;


/****/
const HOME_PAGE         = 'index.html';                     //homepage
var homeButton      = document.getElementById('home-button');
var shutdownButton 	= document.getElementById('shutdown-button');
var bhInclude 		= require("./include.js");
var statusLabel		= document.getElementById('status');
var bhAddr =""
var setAddrButton	= document.getElementById('addr-button');
var addrIp			= document.getElementById('inputaddr');
var addrText		= document.getElementById('addr');
var settingAddr		= false;
/****/

document.getElementsByTagName("BODY")[0].onload = initSetupPage();
document.getElementsByTagName("BODY")[0].onunload = stub();

function stub(){
	console.log("unload stub");
}

/*load tile template and get bells config from server*/
function initSetupPage(){
	console.log('initSetupPage');
	statusUpdate("Initialising...");statusOK();
	settingAddr		= false;
    //get tile template from url
    getTileTemplate(TILE_TEMPLATE, function(result){
        template = result;
		addToolbarBindings();
		if (getBHAddr()){
			addrSet(bhAddr);addrOK();
			bhInclude.testStarted(bhAddr).then(function (started){
				if(started != null){
					if (started){
						bhStart();
						statusUpdate("Updating...");statusOK();
						//buttonStartStateSet(started);
					}else{
						bhStop();
						statusUpdate("Stopped...");statusBad('black');
						//buttonStartStateSet(started);
					}
				}else{
					console.log('initSetupPage : No Comms');
					commsLost();
				}
			},function(err){
				console.log("Err in initSetupPage  :" + err);
				commsLost();
				}
			).catch(function(error){
				console.log("Caught in initSetupPage " + error);
				commsLost();
			});
		}
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
    //delete this bell from local map
    this.localDelete = function(){
        this.disable();               //disable tile
		thisBell.tile.remove();     //remove from screen 
    };

	//delete this bell from bellhouse - Note will remove it from config permanently
	this.bellDelete = function(){
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
		console.log ("DeleteButton Bind Event");
        bellArray.splice(bellArray.indexOf(thisBell), 1);   //delete this bell from array
        thisBell.bellDelete();                              //now delete it 
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
	
    homeButton.addEventListener('click', function(evt){
        window.location.href=HOME_PAGE;
    });
	
    addButton.addEventListener('click', function(evt){
        var newBells = parseInt(bellCount.val());
		//HERE check that the Pi has enough HATS
        var startIndex = bellArray.length > 0 ? bellArray[bellArray.length - 1].id + 1 : 0;     //if bells in list, use id of last bell in array + 1, else use 0
        var finishIndex = startIndex + newBells;
        for (var i = startIndex; i < finishIndex; i++) {
            var b = new Bell(template, i, 45);
            bellArray.push(b);              //add new bell to array
            b.add();                        //add bell to bell server
        }
    });
	
	shutdownButton.addEventListener('click', function(evt){
		console.log('shutdownButton');
		statusUpdate("Shutdown Requested");statusBad('brown');
		pageEnable(false);
		buttonState(startButton,false);
		buttonState(shutdownButton,false);
		return requestPromise (
			{ url : bhAddr + '/shutdown'}
			);
	});
	
    resetButton.addEventListener('click', function(evt){
		bellsLocalDelete();
		//HERE reread config from BH ?
	});

    startButton.addEventListener('click', function(evt){
		bhStartStop(bellArray);
    });
	
	setAddrButton.addEventListener('click', function(evt){
		console.log('setAddrButton:click');
		if (!settingAddr){
			//Change BH Address
			setAddrButton.innerHTML='Set';
			settingAddr=true;
			addrText.style.display='none';
			addrIp.style.display='unset';
			if (addrText.innerHTML!='No Address Set'){
				addrIp.value=addrText.innerHTML;
			}
		}else{
			//Set BH Address
			statusUpdate('Communicating...');
			console.log('Bellohous address set to >' + addrIp.value);
			bhAddr = addrIp.value
			bhInclude.objConfig.ipAddr = addrIp.value;
			bhInclude.writeSysConfig(bhInclude.objConfig);	
			addrSet(addrIp.value);
			setAddrButton.innerHTML='Change';			
			settingAddr=false;
			addrText.style.display='unset';
			addrIp.style.display='none';
			bhInclude.testStarted(bhAddr).then(function (started){
				if(started != null){
					buttonStartStateSet(started);
					if (started){
						statusUpdate("Ready...");statusOK();
					}else{
						statusUpdate("Stopped...");statusBad('black');
					}
				}else{
					console.log('addToolbarBindings():setAddrButton.addEventListener : No Comms');
					commsLost();
				}
			},function(err){
				console.log("Err in addToolbarBindings():setAddrButton.addEventListener  :" + err);
				commsLost();
				}
			).catch(function(error){
				console.log("Caught in addToolbarBindings():setAddrButton.addEventListener " + error);
				commsLost();
			});		
		}
	});
}

function buttonStartStateSet(started){
	if(started){
		pageEnable(true);
		startButton.innerHTML="Stop";
	}else{
		pageEnable(false);
		buttonState(startButton,true);
		buttonState(shutdownButton,true);
		startButton.innerHTML="Start";
	}
}

function bhStartStop(bells){
	console.log("bhStartStop");
	pageEnable(false);
	statusUpdate("Communicating...");
	bhInclude.testStarted(bhAddr).then(function (started){
		if(started != null){
			console.log("bhStartStop Started :" + started);
			if (!started){
				return(bhStart());
			}else{
				return(bhStop());
			}
		}else{
			console.log('bhStartStop : No Comms');
			commsLost();
		}
	}).catch (function (err){
		statusUpdate("Failed To Start...");statusBad('brown');
		console.log('ERROR : bhStartStop started() : ',err);
	});
}

function bhStop(){
	//Put the bellhouse into Stopped mode. Return promise
	return requestPromise (
		{ url : bhAddr + '/stop' }
	).then (function (response){ 
		bellsLocalDelete()
		console.log ("bhStop /stop >" + response);
		buttonStartStateSet(false);
		statusUpdate("Stopped...");statusBad('black');
	}).catch (function (err){
		statusUpdate("Failed To Stop...");statusBad('brown');
		console.log('ERROR : bhStop /stop : ',err);
	});
}
function bhStart(){
	console.log("Starting BellHouse");
	return requestPromise (
		{ url : bhAddr + '/start' }
	).then (function (response) {
		console.log ("bhStart /start >" + response);
		return requestPromise (
			{ url : bhAddr + '/loadconf' }
		).then (function (response) {
			console.log ("bhStart /loadconf >" + response);
			bellsLocalDelete();
			bellArray = getBellsFromServer(template);
			return requestPromise (
				{ url : bhAddr + '/hats ' }
			).then (function (response) {
				console.log ("bhStart /hats >" + response);
				
				buttonStartStateSet(true);
				statusUpdate("Ready...");statusOK();
			}).catch (function (err) {
				
			});
		}).catch (function (err){
			statusUpdate("Failed To Load Configuration...");statusBad('brown');
			console.log('ERROR : bhStart /loadconf : ',err);
		});
	}).catch (function (err){
		statusUpdate("Failed To Start...");statusBad('brown');
		console.log('ERROR : bhStart /start : ',err);
	});
}


function bellsLocalDelete(){
	//Delete all bells locally displayed
	var bells = bellArray.length;
	for (var i = 0; i < bells; i++) {
		bellArray.pop().localDelete();       //remove bell from array and delete from screen
	}
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
        url: bhAddr + '/servos',
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
        url: bhAddr + '/servos/' + id,
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
        url: bhAddr + '/strike',
        method: 'POST',
        dataType: "json",
        contentType: "application/json",     
        data: servoIdArray
    }).then(function(response) {
        console.log("Moved servo with id " + id);
    });
};

function getBellsFromServer(template) {
    var bells = [];  
    $.ajax({
        url: bhAddr + '/servos',
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

 
/****************************************/
function commsLost(){
	console.log("commsLost");
	statusLabel.innerHTML=" Bellhouse communication lost...";
	statusBad('brown');
	pageEnable(false);
} 
function commsOK(){
	console.log("commsOK");
	statusLabel.innerHTML=" Bellhouse communication OK...";
	statusOK();
	pageEnable(true);
}
function statusUpdate(newStatus){
	statusLabel.innerHTML=" Bellhouse " + newStatus;
}
function statusOK(){
	statusLabel.style.border='unset';
	statusLabel.style.padding = '3px 0px';
}
function statusBad(colour){
	statusLabel.style.borderStyle = 'solid';
	statusLabel.style.borderColor = colour;
	statusLabel.style.padding = '3px 10px';
}
function addrSet(address){
	addrText.innerHTML=address;
}
function addrOK(){
	addrText.style.border='unset';
}
function addrBad(){
	addrText.style.border='solid';
}
function pageEnable(enable){
	console.log("pageEnable : " + enable);
//	buttonState(homeButton,enable);
	buttonState(addButton,enable);
	buttonState(resetButton,enable);
	buttonState(startButton,enable);
	buttonState(shutdownButton,enable);
}

function buttonState(aButton,enable){
//	console.log("buttonState : " + aButton.id)
	if(!enable){
		aButton.style.backgroundColor = "#8c8c8c";
		aButton.disabled=true;
	}else{
		aButton.style.backgroundColor = "#66aa5d";
		aButton.disabled=false;
	}
}
function getBHAddr(){
	var readOK = false;
	console.log ("getBHAddr ");
	console.log(bhInclude.objConfig.ipAddr);
	bhInclude.objConfig = bhInclude.readSysConfig(bhInclude.objConfig);
	console.log("bhAddr >" + bhInclude.objConfig.ipAddr);
	if (bhInclude.objConfig.stat === "Unreadable"){
		statusUpdate("Browser doesn't permit access to local storage");
	}else if (bhInclude.objConfig.stat === "Error"){
		statusUpdate("Error reading from local storage");
	}else if (typeof bhInclude.objConfig.stat ==="undefined"){
		statusUpdate("No Address in local storage");
	}else{
		readOK = true;
		bhAddr = bhInclude.objConfig.ipAddr;
	}
	return(readOK);
}


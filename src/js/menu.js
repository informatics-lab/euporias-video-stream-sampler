'use strict';
//const BELL_SERVER       = "http://bellhouse.eu.ngrok.io";
//const BELL_SERVER       = "http://192.168.1.156:5000";
const AUDIO_PAGE        = 'audio.html';                     
const VIDEO_PAGE        = 'video.html';                     
const MIDI_PAGE         = 'midiIn.html';                    
const WORDS_PAGE        = 'words.html';                    
const SCAN_PAGE         = 'scan.html';                    
const SETUP_PAGE        = 'setup.html';                    
const RECORDING_PLAY	= 'player.html';
var $               	= require("jquery");

var audioButton 	= document.getElementById('audio-button');
var videoButton 	= document.getElementById('video-button');
var midiButton		= document.getElementById('midi-button');
var wordsButton 	= document.getElementById('words-button');
var scanButton	 	= document.getElementById('scan-button');
var setupButton 	= document.getElementById('setup-button');
var recordingButton = document.getElementById('playrecording-button');

/****/
var bhInclude 		= require("./include.js");
var statusLabel		= document.getElementById('status');
var bhAddr =""
var addrText		= document.getElementById('addr');
var stopButton		= document.getElementById('addr-button');
var settingAddr		= false;
var bhStarted		= false;


initControls();


function initControls(){


	console.log ("initControls");
	
	addToolbarBindings();

	bhPageStart();
	initCommonControls();

	/*
	if (getBHAddr()){
		addrSet(bhAddr);addrOK();
		bhInclude.testStarted(bhAddr).then(function (started){
			if(started != null){
				if (started){
					statusUpdate("Ready...");statusOK();
					buttonStartStateSet(started);
				}else{
					statusUpdate("Stopped...");statusBad('black');
					buttonStartStateSet(started);
				}
			}else{
				console.log('initControls : No Comms');
				commsLost();
			}
		},function(err){
			console.log("Err in initControls  :" + err);
			commsLost();
			}
		).catch(function(error){
			console.log("Caught in initControls " + error);
			commsLost();
		});
	}
	*/
}

function addToolbarBindings(){
	
    audioButton.addEventListener('click', function(evt){
        window.location.href=AUDIO_PAGE;
	});
    videoButton.addEventListener('click', function(evt){
        window.location.href=VIDEO_PAGE;
	});
    midiButton.addEventListener('click', function(evt){
        window.location.href=MIDI_PAGE;
	});
    wordsButton.addEventListener('click', function(evt){
        window.location.href=WORDS_PAGE;
	});
    scanButton.addEventListener('click', function(evt){
        window.location.href=SCAN_PAGE;
	});
    setupButton.addEventListener('click', function(evt){
        window.location.href=SETUP_PAGE;
	});
    recordingButton.addEventListener('click', function(evt){
        window.location.href=RECORDING_PLAY;
	});
}

function buttonStartStateSet(started){
	if(started){
		pageEnable(true);
	}else{
		pageEnable(false);
		buttonState(startButton,true);
	}
}


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
	statusLabel.innerHTML=" " + newStatus;
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
	buttonState(audioButton,enable);
	buttonState(videoButton,enable);
	buttonState(midiButton,enable);
	buttonState(wordsButton,enable);
	buttonState(scanButton,enable);
	buttonState(recordingButton,enable);
}
function buttonState(aButton,enable){
	//console.log("buttonState : " + aButton.id)
	if(!enable){
		aButton.style.backgroundColor = "#8c8c8c";
		aButton.disabled=true;
	}else{
		aButton.style.backgroundColor = "#66aa5d";
		aButton.disabled=false;
	}
}
function stopButtonShown(aButton,showStop){
	if(showStop){
		aButton.innerHTML="Stop";
	}else{
		aButton.innerHTML="Start";
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
function bhPageStart(){
	if (getBHAddr()){
		addrSet(bhAddr);addrOK();
		bhInclude.testStarted(bhAddr).then(function (started){
			if(started != null){
				if (started){
					statusUpdate("Bellhouse Ready...");statusOK();
					pageEnable(true);
					bhStarted = true;
				}else{
					statusUpdate("Bellhouse Stopped...");statusBad('black');
					stopButtonShown(stopButton,false);	//Shows Start 
					bhStarted = false;
//					commsOK();
				}
			}else{
				console.log(' : No Comms');
				commsLost();
			}
		},function(err){
			console.log("Err   :" + err);
			commsLost();
			}
		).catch(function(error){
			console.log("Caught  " + error);
			commsLost();
		});
	}
}
function initCommonControls(){
	console.log("initCommonControls")	
	stopButton.addEventListener('click',function(evt){
		console.log("stopButton");
		//bhInclude.testStarted(bhAddr).then(function (started){
		if (bhStarted){
			statusUpdate("Stopping Bellhouse...")
			bhInclude.bhStop(bhAddr).then (function (response){ 
				console.log ("bhStop /stop >" + response);
				statusUpdate("Stopped...");statusBad('black');
				stopButtonShown(stopButton,false);
				pageEnable(false);
				bhStarted = false;
			}).catch (function (err){
				pageEnable(false);
				console.log('ERROR : bhStop /stop : ',err);
				statusUpdate("Failed To Stop...");statusBad('brown');
			});
		} else {
			statusUpdate("Starting Bellhouse...")
			bhInclude.bhStart(bhAddr).then (function (response) {
				console.log ("bhStart /loadconf >" + response);
				pageEnable(true);
				statusUpdate("Bellhouse Ready...");statusOK();
				stopButtonShown(stopButton,true);
				console.log("HERE Setting bhStarted = true");
				bhStarted = true;
			}).catch (function (err){
				pageEnable(false);
				statusUpdate("Bellhouse Configuration Failed...");statusBad('brown');
				console.log('ERROR : bhStart /loadconf : ',err);
			});
		}
	});
}



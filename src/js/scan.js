'use strict';

const bells=34;			//Number of Bells


//See Letter frequency spreadsheet - 
var letterMap = [21,4,7,12,32,6,6,16,19,1,2,11,7,18,20,5,1,16,17,24,8,3,6,1,6,1];

var request = require('request');
var requestPromise	= require('request-promise-native');
var sampling = false;
var recording = false;
var playing = false;
var samplingInterval, sampleLoop, sample;
var samplingPtr = 0;
var samplingEndPos = 0;

var wordIP			= document.getElementById('wordsIP');
var stopButton		= document.getElementById('add-button');
var selectLabel 	= document.getElementById('select-label');

/****/
const HOME_PAGE    	= 'index.html';                     //homepage
var bhInclude 		= require("./include.js");
var homeButton      = document.getElementById('home-button');
var statusLabel		= document.getElementById('status');
var bhAddr =""
var stopButton		= document.getElementById('addr-button');
var addrIp			= document.getElementById('ipaddr');
var addrText		= document.getElementById('addr');
var recordingButton = document.getElementById('record-button');
var recordingName	= document.getElementById('rec-name');
var bhStarted		= false;
/****/


/*Setup event listeners for controls on homepage */
initControls();

function initControls() {

	console.log ("initControls");

    var sampleInterval = document.getElementById('sample-interval');
	
	bhPageStart();
	initCommonControls();

    sampleInterval.addEventListener('change', function (evt) {
		statusUpdate("Changed Interval")
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamples();
        }
    });
		
	wordIP.onkeyup=function(evt){	//HERE should be an event listener?
		//console.log("keyupevent key follows");
		//console.log(wordIP.value.substring(wordIP.value.length - 1));
		console.log("wordIP.value.substring(wordIP.length - 1).charAt(0) >" + wordIP.value.substring(wordIP.value.length - 1).charCodeAt(0));
		if (wordIP.value.substring(wordIP.value.length - 1).charCodeAt(0) == 10 ){
			//wordIP.disabled=true;
			buttonState(wordIP,false);
			samplingPtr = 0;
			samplingStart();
		}
	};
	
    homeButton.addEventListener('click', function(evt){
        window.location.href=HOME_PAGE;
    });
	
	samplingInterval = sampleInterval.value * 1000;

}

function samplingStart(){
	console.log("samplingStart");
    sampling = true;
	//Start position
	if (wordIP.selectionStart != wordIP.value.length){
		//User has cursor somewhere in middle of text
		samplingPtr = wordIP.selectionStart;
	}else{
		samplingPtr = 0;
	}
	//End position
	if (wordIP.selectionEnd != wordIP.selectionStart){
		//User has selected a portion of the Text
		samplingEndPos = wordIP.selectionEnd;
	}else{
		samplingEndPos = wordIP.value.length;
	}
    createSamples();
	wordIP.disabled=true;
}

function samplingStop(){ 
    sampling = false;
    clearSamples();
	wordIP.value="";
//	wordIP.disabled=false;
	buttonState(wordIP,true);
}


function createSamples() {
    console.log("Initialising sample, sampling at " + samplingInterval + " millis");
	statusUpdate("Getting New Samples ")

    clearSamples();

    sampleLoop = setInterval(function () {
		try{
			var aChar;
			var	numChar;		
			aChar = wordIP.value.charAt(samplingPtr);
			aChar = aChar.toUpperCase();
			numChar = aChar.charCodeAt(0);
			if (numChar < 48 || (numChar >= 58 && numChar <= 64) || (numChar > 90)){
				//Unprintable or punctuation
				sampleToRequest(1);
			}else if(numChar >= 48 && numChar <= 57){
				//Digit
				if (numChar == 48){
					numChar++;	//'0' still sounds
				}
				sampleToRequest(numChar - 48);	
				
			}else{
				sampleToRequest(letterMap[numChar - 65])
			}
		}catch(err){
			samplingStop();
			console.log("Caught  " + err);
		}
		samplingPtr++;
		if ( samplingPtr >= samplingEndPos){
			console.log("Ending")
			samplingStop();
		}
    }, samplingInterval);

};


function clearSamples() {
    if (sampleLoop) {
        clearInterval(sampleLoop)
    }
    if (sample) {
        sample = {};
    }
}


function sampleToRequest(numBells) {
    var JSONArray = [];
	if (numBells > bells){
		numBells = bells;
	}
	//Bias the bells to strike around the middle
	var startBell = Math.floor(bells / 2) - Math.floor(numBells / 2 ) ;
	if ( startBell <= 0){
		startBell = 1;
	}
	if ( (startBell + numBells) > bells ){
		numBells = numBells - (bells - (startBell + numBells));
	}
	for(var i = startBell ; i < startBell + numBells; i++){
		JSONArray.push(i);
	}

	//HERE Request Promise and show the result
    if(JSONArray.length > 0) {
        request.post(bhAddr + '/strike').json(JSONArray);
		statusUpdate("Striking " + JSONArray.length + " Bells");
		console.log('json : ',(JSONArray));
    }else{
		statusUpdate("No Bells To Strike");
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
	buttonState(wordsIP,enable);
	buttonState(recordingButton,enable);
	buttonState(recordingName,enable);
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
				bhInclude.isRecording(bhAddr).then(function (recordingResp){
					if(recordingResp != null){
						if (recordingResp){
							recording = true
							recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Stop Recording";
						}else{
							recording = false
							recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Start Recording";
						}
					}else{
						console.log(' : Bad response - setting recording False');
						recording = false
						recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Start Recording";
					}
				});
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
				if (sampling){
					samplingStop();
				}
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

    recordingButton.addEventListener('click', function(evt) {
       if(!recording) {
			console.log("Filename >" + recordingName.value);
			if (recordingName.value == ""){
				alert ("Please enter a name for the recording");
				return;
			}
			var recordName = recordingName.value;
			var ok;
			request(bhAddr+'/records', function(error, response, body) {
				var records = JSON.parse(body).records;
				if(records.includes(recordingName.value)){
					if (confirm("Recording Exists Do you want to overwrite it?") == false){
						ok=false;
					}else{
						ok=true;
					}
					if (ok){
						request
						   .post(bhAddr+'/recording')
						   .json({record_filename: recordName})
						   .on('response', function(response) {
//							   alert("Now Recording...");
							   recording = true;
							   recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Stop Recording";
						   });
					}
				}
			});
		} else {
			request
				.get(bhAddr+'/recording/stop')
				.on('response', function(response) {
//					alert("Recording Stopped");
                    recording = false;
					recordingButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i> Start Recording";
                });
//                listRecordings();
       }
    });
}


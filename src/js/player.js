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
var piece;
var pieceTiming = false;
var pieceTime = 0;

var recordSelector  = document.getElementById('records-list');
var playRecButton	= document.getElementById('play-record-button');
var wordOP			= document.getElementById('wordsOP');
var stopButton		= document.getElementById('add-button');
var pieceTimeButton	= document.getElementById('piece-time');
var selectLabel 	= document.getElementById('select-label');
var sampleInterval = document.getElementById('sample-interval');

/****/
const HOME_PAGE    	= 'index.html';                     //homepage
var bhInclude 		= require("./include.js");
var homeButton      = document.getElementById('home-button');
var statusLabel		= document.getElementById('status');
var bhAddr =""
var stopButton		= document.getElementById('addr-button');
var addrIp			= document.getElementById('ipaddr');
var addrText		= document.getElementById('addr');
var settingAddr		= false;
var bhStarted		= false;
/****/


/*Setup event listeners for controls on homepage */
initControls();

function initControls() {

	console.log ("initControls");
	
	bhPageStart();
	initCommonControls();
	
 
/* 
    //bellhouse plays
	playRecButton.addEventListener('click', function(evt) {
        if(!playing) {
            var record = document.getElementById('records-list').value;
            request
                .get(bhAddr+'/records/'+record.replace('.json', '')+'/play')
                .on('response', function(response) {
                    playRecButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i>";
                    playing = true;
                });
        } else {
            request
                .get(bhAddr+'/records/stop')
                .on('response', function(response) {
                     playRecButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i>";
                     playing = false;
            });
        }
    });
*/

    playRecButton.addEventListener('click', function(evt) {
        if(!sampling) {
            var record = document.getElementById('records-list').value;
			if (record == "") {
				statusUpdate("Nothing to play");
			}else{
				return requestPromise (
					{ url : bhAddr + '/records/' + record.replace('.json', '')  }
				).then (function (response){ 
					piece = JSON.parse(response);
					if ( piece.recording.length == 0){
						statusUpdate("Piece is empty...");statusBad('brown');
					}else{
/*HERE reference - delete when done		
						console.log(response);
						console.log(piece);
						console.log(piece.recording.length);
						console.log(piece.recording[0]);
						console.log(piece.recording[0].strike);
						console.log(piece.recording[0].time);
						request.post(bhAddr + '/strike').json(piece.recording[0].strike);
*/						
						samplingStart();
					}
				}).catch (function (err){
					statusUpdate("Failed To get recording...");statusBad('brown');
					console.log('ERROR : records/ ' + record.replace('.json', '') ,err);
				});
				
			}
        } else {
			samplingStop();
        }
    });


	listRecordings();
	
	sampleInterval.addEventListener('change', function (evt) {
		statusUpdate("Changed Interval")
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamplesInterval(samplingInterval);
        }
    });

	pieceTimeButton.addEventListener('change', function(evt){
		if (evt.target.checked){
			pieceTiming=true;
			buttonState(sampleInterval,false);
			console.log('Piece Time On');
		} else {
			pieceTiming=false;
			buttonState(sampleInterval,true);
			console.log('Piece Time Off');
		}
	});
    homeButton.addEventListener('click', function(evt){
        window.location.href=HOME_PAGE;
    });
	
    samplingInterval = sampleInterval.value * 1000;
}

function listRecordings() {
    request(bhAddr+'/records', function(error, response, body) {
        while (recordSelector.firstChild) {
            recordSelector.removeChild(recordSelector.firstChild)
        }
        var records = JSON.parse(body).records;
            records.forEach(function(record) {
                var option = document.createElement('option');
                option.value = record;
                option.innerHTML = record;
                recordSelector.appendChild(option);
            });
    });
};


function samplingStart(){
	console.log("samplingStart");
    sampling = true;
	wordOP.value="";

	//Start position
	samplingPtr = 0;
	//End position
	samplingEndPos = piece.recording.length;
	statusUpdate("Playing " + samplingEndPos + " samples")
    createSamplesInterval(samplingInterval);
	playRecButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Stop Playing";
    playRecButton.style.backgroundColor = "#aa4b46";
}

function samplingStop(){ 
	console.log("samplingStop");
    sampling = false;
    clearSamples();
	playRecButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i> Play Recording";
    playRecButton.style.backgroundColor = "#66aa5d";
	wordOP.value="";
	statusUpdate("Playing Stopped");
}

function createSamplesTimeout() {
}

function createSamplesInterval(interval) {
    console.log("Creating Samples for " + interval + " millis time");

    clearSamples();

    sampleLoop = setInterval(function () {
		try{
			sampleToRequest(piece.recording[samplingPtr].strike);
			pieceTime = piece.recording[samplingPtr].time;
			console.log("pieceTime >" + pieceTime);
			wordOP.value = wordOP.value + '\r\n' + piece.recording[samplingPtr].strike;
			samplingPtr++;
		}catch(err){
			samplingStop();
			console.log("Caught  " + err);
		}
		samplingPtr++;
		if ( samplingPtr >= samplingEndPos){
			console.log("Ending")
			samplingStop();
		} else {
			if (pieceTiming){
				//clearInterval(sampleLoop);
				console.log("createsamp PT On");
				console.log(piece.recording[samplingPtr].time + "<>" + pieceTime);
				if (piece.recording[samplingPtr].time > pieceTime){
					createSamplesInterval((piece.recording[samplingPtr].time - pieceTime) * 1000);
				}else{
					statusUpdate("Error in piece timing ");
					console.log(piece.recording[samplingPtr].time + "<>" + pieceTime);
					samplingStop();
				}
			}else{
				console.log("createsamp PT Off");
			}
		}
    }, interval);

};


function clearSamples() {
    if (sampleLoop) {
        clearInterval(sampleLoop)
    }
    if (sample) {
        sample = {};
    }
}


function sampleToRequest(strike) {
	//HERE Request Promise and show the result
    if(strike.length > 0) {
		request.post(bhAddr + '/strike').json(strike);
		statusUpdate("Striking " + strike.length + " Bells");
		console.log('json : ',(strike));
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
	buttonState(playRecButton,enable);
//	buttonState(wordsIP,enable);
	buttonState(recordSelector,enable);
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
					listRecordings();
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
}


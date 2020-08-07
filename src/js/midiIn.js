'use strict'
var request = require('request');
var requestPromise	= require('request-promise-native');

var bassNote = 0;
var tenorNote = 32;
var altoNote = 64;
var sopranoNote = 96;

var midiIP			= document.getElementById('midiIP');

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
var settingAddr		= false;
var bhStarted		= false;
var recording		= false;
/****/


    
var bassBells = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34];

var tenorBells = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18],[19,20],
[21,22],[23,24],[25,26],[27,28],[29,30],[31,32],[33,34],[1,34],[2,33],[3,32],
[4,31],[5,30],[6,29],[7,28],[8,28],[9,27],[10,26],[11,25],[12,24],[13,23],
[14,22],[15,21],[16,20],[17,19]];
    
var altoBells = [[1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15],[16,17,18],[19,20,21],[22,23,24],[25,26,27],[28,29,30],[31,32,33],[34,1,2],[33,3,4],[32,5,6],[31,7,8],[30,9,10],[29,11,12],[28,13,14],[27,15,16],[26,17,18],
[25,19,20],[24,21,22],[23,24,25],[22,26,27],[21,28,29],[20,30,31],[19,32,33],[18,34,1],[17,33,2],[16,32,3],
[15,31,4],[14,30,5],[13,29,6],[12,28,7]];

var sopranoBells = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20],[21,22,23,24],[25,26,27,28],[29,30,31,32],[33,34,1,2],[32,1,16,17],
[31,2,15,18],[30,3,14,19],[29,4,13,20],[28,5,12,21],[27,6,11,22],[26,7,10,23],[25,8,9,24],[23,10,7,26],[22,11,6,27],[21,12,5,28],
[20,13,4,29],[19,14,3,30],[18,15,2,31],[17,16,1,32],[15,18,34,33],[14,19,32,1],[13,20,31,2],[12,21,30,3],[11,22,29,4],[10,23,28,5],
[9,24,27,6],[8,25,26,7],[6,27,24,8],[7,28,23,9]];


/*Setup event listeners for controls on homepage */
initControls();

function initControls() {
	console.log ("initControls");
	
	bhPageStart();
	initCommonControls();


    homeButton.addEventListener('click', function(evt){
        window.location.href=HOME_PAGE;
    });
	
}	


var midi, data;
// request MIDI access
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    alert("No MIDI support in your browser.");
}

// midi functions
function onMIDISuccess(midiAccess) {
    // when we get a succesful response, run this code
    console.log("midi ok");
    
    for (var input in midiAccess.inputs){
    console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
      "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
      "' version:'" + input.version + "'" );
 	 }

	for (var output in midiAccess.outputs){
    console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
      "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
      "' version:'" + output.version + "'" );
  	}
    
    midi = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

    var inputs = midi.inputs.values();
    // loop over all available inputs and listen for any MIDI input
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        // each time there is a midi message call the onMIDIMessage function
        input.value.onmidimessage = onMIDIMessage;
    }
}

function onMIDIFailure(error) {
    // when we get a failed response, run this code
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + error);
}


  
function onMIDIMessage(message) {
	var midiStrike = [];
    data = message.data; // this gives us our [command/channel, note, velocity] data.
    //console.log('MIDI data', data); // MIDI data [144, 63, 73]
	if (bhStarted){
		if (data[2] > 1){
		  console.log("note on");
		  console.log ("note is: " + data[1]);
		
			if (data[1] <= 31){
				midiStrike = bassBells[data[1] - bassNote];
			}
			else if (data[1] <= 63){
				midiStrike = tenorBells[data[1] - tenorNote];
			}
			else if (data[1] <= 95){
				midiStrike = altoBells[data[1] - altoNote];
			}
			else if (data[1] <= 127){
				midiStrike = sopranoBells[data[1] - sopranoNote];
			}
		
			console.log("strike is: \n",midiStrike);
			midiIP.value="";
			midiIP.value=data[1];
			request.post(bhAddr + '/strike').json(midiStrike);
			statusUpdate("Striking " + midiStrike.length + " Bells");
			console.log('json : ',(midiStrike));
		}
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
	buttonState(midiIP,enable);
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


'use strict';
//const BELL_SERVER = "http://bellhouse.eu.ngrok.io";
//const BELL_SERVER = "http://0.0.0.0:5000";	//Testing
//const BELL_SERVER = "http://192.168.20.29:5000" //Ngrok Bypass if on same lan

//const bells=16;			//numbers of bells
//const bells=34;			//numbers of bells
const EQGainMax = 50;
const EQGainMin = -175;
//const bassSkip = 10;		//Number of bass bins to drop - even number only!
//const bassSkip = 0;		//Number of bass bins to drop - even number only!

var bassSkip = 10;
var bells = 0;
var request = require('request');
var requestPromise	= require('request-promise-native');
var stream;


var audioCtx, analyser, gainNodeOp, gainNodeIp, oscNode, eqNodes=[];
//var frequencyData;
var audioConstraints = { audio: true }; 
var micSource;
var micSourceOK=false;
var playerSource;
var playerSourceOK=false;

//var canvasFreqD;
var ctxFreqD;

var bellSamples = [],sampleNum;

//var player;



var processingBells = false;
var sampling = false;
var recording = false;
var playing = false;

var audioLoaded = false;
var live = true;
var ipThreshold, ipThresholdMax, threshold;
var thresholdAuto = false;
var samplingInterval,sampleLoop;
var URL=window.URL;
var fileURL;


var liveButton = document.getElementById('live-button');
//var setupButton = document.getElementById('setup-button');
var samplingButton = document.getElementById('sampling-button');
//var selectLabel = document.getElementById('select-label');
var selectButton = document.getElementById('select-button');
var audio = document.getElementById('audio');
var canvasFreqD = document.getElementById('canvasFreq');
var bassCut = document.getElementById('bass-cut');
var sampleInterval = document.getElementById('sample-interval');

/****/
const HOME_PAGE         = 'index.html';                     //homepage
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
/****/




//Start Me Up
initControls();
initAudio();
//configureAnalyser(bells);
//update();

function initAudio(){
	
	console.log("initAudio");

	//Setup Audio 
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();	
	gainNodeOp = audioCtx.createGain();
	gainNodeOp.gain.value=0;	//Avoid Feedback
	gainNodeIp = audioCtx.createGain();
	oscNode = audioCtx.createOscillator();

	// Mic media stream
	navigator.mediaDevices.getUserMedia(audioConstraints)
	.then(function(mediaStream) {
		micSource = audioCtx.createMediaStreamSource(mediaStream);
		micSourceOK=true;
		micSource.connect(gainNodeIp);	//We start in live mode so connect it
		console.log("Mic Access OK");
	})
	.catch(function(err) { console.log(err.name + ": " + err.message); alert("No Microphone Available");});

	//Connect the audio nodes together - analyser not yet created
	gainNodeOp.connect(audioCtx.destination);

	//Connect to the player
	//Do this after the player is ready to play - see https://code.google.com/p/chromium/issues/detail?id=112368#c4)
	audio.addEventListener('canplay', function(evt){
		if (!playerSourceOK){
			playerSource = audioCtx.createMediaElementSource(this);
			playerSourceOK=true;
			playerSource.connect(gainNodeIp);
		}
	});
	
	analyser = audioCtx.createAnalyser();

}
function disconnectAnalyser(){
	console.log("disconnectAnalyser");
	try{
		analyser.disconnect();
	}catch(err){
		console.log("Disconnect failed with " + err.name + " - may not have been connected?");
	}
}

function configureAnalyser(freqBands){
	
	var eqNodeCount, ctrlEqNodes, fMax, fSize, fBinWidth, halfSlider;
	
	console.log("configureAnalyser freqBands >" +freqBands);
	disconnectAnalyser();
	//raise freqBands x 2 to the next power of 2
	//console.log("set fftSize to >" + Math.pow(2, (Math.ceil(Math.log(freqBands * 2)/Math.log(2)))));
	fSize = Math.pow(2, (Math.ceil(Math.log(freqBands * 2)/Math.log(2))));
	if (fSize < 32){
		fSize = 32;
	}else if (fSize > 1024){
		fSize = 1024;
	}
	analyser.fftSize = fSize;
	console.log("analyser.fftSize = " + analyser.fftSize);
	console.log("analyser.frequencyBinCount >"+analyser.frequencyBinCount);
	fMax=audioCtx.sampleRate / 2;			//Nyquist / 2 
	fBinWidth = fMax / analyser.frequencyBinCount;
		
	//Connect the analyser
	gainNodeIp.connect(analyser);
	analyser.connect(gainNodeOp);

	

	//EQ
	eqNodeCount = analyser.frequencyBinCount / 2;	//1 node per 2 bins
	console.log("eqNodeCount >" + eqNodeCount);
	halfSlider = EQGainMin + ((EQGainMax - EQGainMin) / 2);
	//Create html controls and filters 
	var eqdiv = document.getElementById('equaliser');
	eqNodes.length=0;
	eqdiv.innerHTML = "";
	for(var i = 1; i <= eqNodeCount; i++) {
		eqNodes.push (halfSlider);
		eqdiv.innerHTML += '<input class="flex-item eq-slider" name="eq-slider" id=' + i +'" type="range"  min="' + EQGainMin + '" max="' + EQGainMax + '"></button>';
	} 
	
	
	//Add listeners  - set gain of an eqNode
	ctrlEqNodes=document.getElementsByName("eq-slider");
	for (var node in ctrlEqNodes){
		if(ctrlEqNodes.hasOwnProperty(node)){
			ctrlEqNodes[node].addEventListener("change", function(evt){
				eqNodes[parseInt(this.id) - 1] = parseInt(evt.target.value);
				console.log("EQ:Number >" + (parseInt(this.id) - 1) + " Gain >" + eqNodes[parseInt(this.id) - 1]);
			}, false);
			ctrlEqNodes[node].addEventListener("dblclick",function (evt) {
				evt.target.value = halfSlider;
				eqNodes[parseInt(this.id) - 1] = parseInt(evt.target.value);
				console.log("EQ:Number >" + (parseInt(this.id) - 1) + " Gain >" + eqNodes[parseInt(this.id) - 1]);
			});
		}
	}
	console.log("audioCtx.sampleRate >"+audioCtx.sampleRate);
	console.log("eqNodeCount >"+eqNodeCount);
	console.log("FMax >"+fMax);
	console.log("fBinWidth >"+fBinWidth);

	console.log("Calling Update");
	update();

}
function initControls() {
    var dim1 = document.getElementById('grid-dim-1');
    var dim2 = document.getElementById('grid-dim-2');
    var sampleThreshold = document.getElementById('sample-threshold');
	var autoThreshold = document.getElementById('auto-threshold');
    var recordingButton = document.getElementById('record-button');
    var playRecordingButton = document.getElementById('play-record-button')
    var selectButton = document.getElementById('select-button');
	//var oscFreqency = document.getElementById('Osc-Freqency');
	//var oscFreqencyText = document.getElementById('Osc-Freqency-Text');

	

	
	console.log("init")	
	
	bhPageStart();
	initCommonControls();
	


	//Initial State Setup
	canvasFreqD.width=window.innerWidth;
    selectButton.style.backgroundColor = "#8c8c8c";
    selectButton.disabled=true;
	ipThreshold = parseInt(sampleThreshold.value);
	ipThresholdMax = sampleThreshold.max;
	threshold = ipThreshold;

	//Event Listeners
    sampleInterval.addEventListener('change', function (evt) {
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamples();
        }
    });

    bassCut.addEventListener('change', function (evt) {
        bassSkip = evt.target.value;
//		if (Math.floor(bassSkip / 2) != 0){
//			//Must be divisible by 2
//			bassSkip = parseInt(bassSkip) + 1;
//		}
		console.log('bassSkip >' + bassSkip);
		configureAnalyser(bells);
    });

    sampleThreshold.addEventListener('change', function(evt){
		var value = parseInt(evt.target.value);
        ipThreshold = value;
		if (!thresholdAuto){
			threshold = ipThreshold;
		}
		console.log("ipThreshold change >" + ipThreshold)
		update();
        if(sampling) {
            createSamples();
        }
    });

	autoThreshold.addEventListener('change', function(evt){
		if (evt.target.checked){
//			sampleThreshold.disabled=true;
			thresholdAuto=true;
			console.log('Auto Threshold On');
		} else {
//			sampleThreshold.disabled=false;
			thresholdAuto=false;
			console.log('Auto Threshold Off');
		}
	});
	
/*
	setupButton.addEventListener('click',function(evt){
		selectButton.enabled=false;
		sampleInterval.enabled=false;
		sampleThreshold.enabled=false;
		setupButton.enabled=false;
		oscFreqencyText.style.display="inline";
		oscFreqency.style.display="inline";
		if (micSourceOK){
			micSource.disconnect();
		}
		if (playerSourceOK){
			playerSource.disconnect();
		}
		oscNode.type = 'sine';
		oscNode.frequency.value = 440; // value in hertz
		oscNode.connect(gainNodeIp);
		oscNode.start();
		gainNodeOp.gain.value=1;
		console.log("Setup Mode");
	});
	
	oscFreqency.addEventListener('change',function(evt){
		//oscNode.stop();
		oscNode.frequency.value=parseInt(evt.target.value);
		//oscNode.start();
	});
*/	
    liveButton.addEventListener('click',function(evt){
		//Switch between Live (mic IP) and Play (player IP) mode
		samplingStop();
		if(live) {
			live = false;
			if (micSourceOK){
				micSource.disconnect();
			}
			gainNodeOp.gain.value=1;
			if (audioLoaded){
				audio.src = fileURL;
				audio.style.display="inline";
				audio.setAttribute("controls",true);
			}
			if (playerSourceOK){
				playerSource.connect(gainNodeIp);
			}
			selectButton.style.display="inline";
			selectButton.style.visibility="visible"
			this.innerText = "Live Mode";
			pageEnable(true);
			console.log("Player Mode Set");
		} else {
			if (micSourceOK){
				live = true;
				if (playerSourceOK){
					playerSource.disconnect();
				}
				gainNodeOp.gain.value=0;
				audio.style.display="none";
				audio.removeAttribute("controls");
				//audio.srcObject=micStream;
				selectButton.style.visibility="hidden"
				liveButton.innerText = "Play Mode";
				pageEnable(true);
				micSource.connect(gainNodeIp);
				console.log("Live Mode Set")
			}else{
				alert("No Microphone Input. Please Refresh Page And Allow Microphone Access")
			}
		}
    });

    selectButton.addEventListener('change', function(evt) {
		var file = this.files[0];
		var type = file.type;
			fileURL = URL.createObjectURL(file);
		audio.src = fileURL;
		audioLoaded = true;
		audio.style.display="inline";
		audio.setAttribute("controls",true);
		audio.style.display=true;
			console.log(audio.src);
    });
        
    audio.addEventListener('play', function(evt) {
		console.log("Sampling")
		selectButton.disabled=true;
			if(!sampling) {
				pageEnable(false);
				samplingStart();
			}
    }, false);

    audio.addEventListener('pause', function(evt) {
	console.log("Sampling Stop")
	selectButton.disabled=false;
        if(sampling) {
			samplingStop();
			pageEnable(true);
		}
    }, false);

    samplingButton.addEventListener('click', function(evt) {
        if(!sampling) {
			if(live){
				pageEnable(false);
				samplingStart();
			}else{
				if (audioLoaded){
					pageEnable(false);
					samplingStart();
					audio.play();
				}else{
					alert("Please select a file first");
				}
			}
        } else {
			samplingStop();
			pageEnable(true);
			if (!live && audioLoaded){
				audio.pause();
			}
	}
    });

    homeButton.addEventListener('click', function(evt){
        window.location.href=HOME_PAGE;
    });

    samplingInterval = sampleInterval.value * 1000;
}


function samplingStart(){
    sampling = true;
	sampleNum=0;
    createSamples();
	pageEnable(false);
    samplingButton.innerHTML = "<i class=\"fa fa-volume-off\" aria-hidden=\"true\"></i> Stop Sampling";
	buttonState(samplingButton,true);
	buttonState(bassCut,true);
	buttonState(sampleInterval,true);
}

function samplingStop(){ 
    sampling = false;
    clearSamples();
	statusUpdate("Sampling Stoped");
	pageEnable(true);
    samplingButton.innerHTML = "<i class=\"fa fa-volume-off\" aria-hidden=\"true\"></i> Start Sampling";
//	buttonState(samplingButton,true);
}


function createSamples() {
    console.log("Initialising sample, sampling at >" + samplingInterval + " millis. ipThreshold >" + ipThreshold);
	statusUpdate("Getting New Samples ")
	
	clearSamples();
    sampleLoop = setInterval(function () {
		
		processingBells = true;
        if(bellSamples) {
            sampleToRequest(bellSamples);
        }else{
			statusUpdate("No Changes Yet ");
		}
		processingBells = false
    }, samplingInterval);

};

function clearSamples() {
    if (sampleLoop) {
        clearInterval(sampleLoop)
    }
	bellSamples.length=0;
	processingBells=false;
}


function sampleToRequest(sampleArray) {
    var JSONArray = [];
	console.log("Sample ("+ sampleNum++ + ") :",sampleArray);
	console.log(threshold);
    sampleArray.forEach(function (sample, index) {
        if(Math.abs(sample) >= threshold) {
            JSONArray.push(index);
        }
    });
	console.log("Request:\n",JSONArray);
    if(JSONArray.length > 0) {
		statusUpdate("Striking " + JSONArray.length + " Bells");
		request.post(bhAddr + '/strike').json(JSONArray);
   }else{
		statusUpdate("No Bells To Strike");
   }
}




function animationCB(){
	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function (callback, element) {
			var currTime = new Date().getTime();
//			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var timeToCall = Math.max(0, 6000 - (currTime - lastTime));
			var id = window.setTimeout(function () { callback(currTime + timeToCall); },
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
}

function cancelAmination(){	
	if (!window.cancelAnimationFrame){
		window.cancelAnimationFrame = function (id) {
			clearTimeout(id);
		};
	}
}

// Get the frequency data and update the visualisation

function update() {
	requestAnimationFrame(update);

	canvasFreqD.width=window.innerWidth;
	var canvasWidth = canvasFreqD.width;
	var canvasHeight = canvasFreqD.height;
//	var numDataPoints = analyser.frequencyBinCount - bassSkip;
	var numDataPoints = analyser.frequencyBinCount;
/*
console.log('fBinCount >' + analyser.frequencyBinCount);
console.log('update bassSkip >' + bassSkip);	
console.log('update numDataPoints >' + numDataPoints);
*/
	var freqData = new Uint8Array(numDataPoints);
	var ctxFreqD = canvasFreqD.getContext('2d');
	var drawThreshold; 
	var numSpacers = numDataPoints;
	var numCells = numDataPoints + Math.round(numSpacers / 2);
	var barWidth = Math.round (canvasWidth / numCells);
	var spacerWidth = Math.round (barWidth / 2);
	var magnitude = [];
	
	//console.log()
	
	analyser.getByteFrequencyData(freqData); //analyser.getByteTimeDomainData(freqByteData);

	freqData.forEach(function (fData , idx){
		magnitude.push(fData  + eqNodes [Math.floor(idx / 2)]);
	});
	
	//Calc threshold if required
	if (thresholdAuto){
		//Average
		/*
		drawThreshold = 0;
		for (var i = 0; i < numDataPoints; ++i) {
			drawThreshold += freqData[i];
		}
		drawThreshold /= numDataPoints;
		threshold = Math.round (drawThreshold / 10); 
		*/
		//Peak Minus
		var drawThreshold = magnitude.reduce(function(a, b) {
			return Math.max(a, b);
		});	
		drawThreshold = drawThreshold - (ipThresholdMax - ipThreshold);
		threshold = Math.round (drawThreshold / 10); 
	}else{
		drawThreshold = threshold * 10;
	}
	
	
//	console.log("canvasWidth >"+ canvasWidth + " numDataPoints >"+numDataPoints+" numCells >"+numCells + " barWidth >"+ barWidth + " spacerWidth >"+spacerWidth);
	ctxFreqD.clearRect(0, 0, canvasWidth, canvasHeight);	//BG Clear
	ctxFreqD.fillStyle = '#d9e6f2';
    ctxFreqD.fillRect(0, 0, canvasWidth, canvasHeight);		//BG Draw
	ctxFreqD.fillStyle = '#ff471a';
	ctxFreqD.fillRect(0, canvasHeight - drawThreshold, canvasWidth, 1);	//Threshold
	ctxFreqD.lineCap = 'round';

 	if (!processingBells){
		bellSamples.length=0;
	}
	var bellNumber=1;
	for (var i = 0; i < numDataPoints; ++i) {
		//Save the bell data
		if (i + 1 > bassSkip){
			if (i > Math.floor( ( (numDataPoints - bassSkip) / bells) * bellNumber) ){
				if (!processingBells){
					bellSamples.push(Math.floor(magnitude[i]/10));
				}
				bellNumber++;
			}
			//console.log("Drawing at >" + magnitude[i]);
			if (magnitude[i] > drawThreshold){
				ctxFreqD.fillStyle = '#b37700'
				ctxFreqD.fillRect(i * (spacerWidth + barWidth), canvasHeight, barWidth, -magnitude[i]);
			} else {
				ctxFreqD.fillStyle = '#F6D565';
				ctxFreqD.fillRect(i  * (spacerWidth + barWidth), canvasHeight, barWidth, -magnitude[i]);
			} 
		} else {
				ctxFreqD.fillStyle = '#d1c8a9';
				ctxFreqD.fillRect(i  * (spacerWidth + barWidth), canvasHeight, barWidth, -magnitude[i]);
		}
	}
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
	buttonState(liveButton,enable);
	buttonState(samplingButton,enable);
	buttonState(selectButton,enable);
	buttonState(recordingButton,enable);
	buttonState(recordingName,enable);
	buttonState(bassCut,enable);
	buttonState(sampleInterval,enable);
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
					statusUpdate("Reading # Bells...");statusOK();
					bhInclude.bhNumBells(bhAddr).then (function (response){
						console.log ("bhNumBells() > " + response);
						bells=response;
						configureAnalyser(bells);
						pageEnable(true);
						statusUpdate("Bellhouse Ready...");statusOK();
						stopButtonShown(stopButton,true);
						if (live){
		//					video.play();
						}
						console.log("Setting bhStarted = true");
						statusUpdate("Bellhouse Ready...");statusOK();
						pageEnable(true);
						bhStarted = true;
					}).catch (function (err){
						pageEnable(false);
						statusUpdate("Bellhouse can't get # bells ...");statusBad('brown');
						console.log('ERROR : bhNumBells : ',err);;
					});
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
			pageEnable(false);
			statusUpdate("Stopping Bellhouse...")
			bhInclude.bhStop(bhAddr).then (function (response){ 
				console.log ("bhStop /stop >" + response);
				statusUpdate("Stopped...");statusBad('black');
				stopButtonShown(stopButton,false);
				if (!live){
					//Nothing to stop
				}else if (sampling){
					samplingStop();
				}
				disconnectAnalyser();
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
				console.log("bhAddr  >" + bhAddr);
				bhInclude.bhNumBells(bhAddr).then (function (response){
					console.log ("bhNumBells() > " + response);
					bells=response;
					configureAnalyser(bells);
					pageEnable(true);
					statusUpdate("Bellhouse Ready...");statusOK();
					stopButtonShown(stopButton,true);
					if (live){
	//					video.play();
					}
					console.log("Setting bhStarted = true");
					bhStarted = true;
				}).catch (function (err){
					pageEnable(false);
					statusUpdate("Bellhouse can't get # bells ...");statusBad('brown');
					console.log('ERROR : bhNumBells : ',err);;
				});
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
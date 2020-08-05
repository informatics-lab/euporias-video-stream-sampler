'use strict';
//const BELL_SERVER = "http://bellhouse.eu.ngrok.io";
//const BELL_SERVER = "http://0.0.0.0:5000";	//Testing
const BELL_SERVER = "http://192.168.20.29:5000" //Ngrok Bypass if on same lan

const bells=34;			//Read this from the bell house ?
const EQGainMax = 50;
const EQGainMin = -175;
const bassSkip = 10;		//Number of bass bins to drop - even number only!


var request = require('request');
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
var setupButton = document.getElementById('setup-button');
var samplingButton = document.getElementById('sampling-button');
//var selectLabel = document.getElementById('select-label');
var selectButton = document.getElementById('select-button');
var audio = document.getElementById('audio');
var canvasFreqD = document.getElementById('canvasFreq');






//Start Me Up
initControls(bells);
update();


function initControls(freqBands) {
    var dim1 = document.getElementById('grid-dim-1');
    var dim2 = document.getElementById('grid-dim-2');
    var sampleInterval = document.getElementById('sample-interval');
    var sampleThreshold = document.getElementById('sample-threshold');
	var autoThreshold = document.getElementById('auto-threshold');
    var recordingButton = document.getElementById('record-button');
    var playRecordingButton = document.getElementById('play-record-button')
    var selectButton = document.getElementById('select-button');
	//var oscFreqency = document.getElementById('Osc-Freqency');
	//var oscFreqencyText = document.getElementById('Osc-Freqency-Text');

	
	var eqNodeCount, ctrlEqNodes, fMax, fBinWidth, fCur, aFilter, aEqNode, halfSlider;

//	alert("Test Page, not linked to ngrok");
	
	console.log("init")	
	console.log("freqBands = " + freqBands);

	//Setup Audio 
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();	

	analyser = audioCtx.createAnalyser();
	//raise freqBands x 2 to the next power of 2
	//console.log("set fftSize to >" + Math.pow(2, (Math.ceil(Math.log(freqBands * 2)/Math.log(2)))));
	analyser.fftSize = Math.pow(2, (Math.ceil(Math.log(freqBands * 2)/Math.log(2))));
	fMax=audioCtx.sampleRate / 2;			//Nyquist / 2 
	fBinWidth = fMax / analyser.frequencyBinCount;
	
	gainNodeOp = audioCtx.createGain();
	gainNodeOp.gain.value=0;	//Avoid Feedback
	gainNodeIp = audioCtx.createGain();
	oscNode = audioCtx.createOscillator();

	//EQ
	eqNodeCount = (analyser.frequencyBinCount - bassSkip) / 2;	//1 node per 2 bins
	halfSlider = EQGainMin + ((EQGainMax - EQGainMin) / 2);
	//Create html controls and filters 
	var eqdiv = document.getElementById('equaliser');
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
	
	console.log("analyser.fftSize = " + analyser.fftSize);
	console.log("analyser.frequencyBinCount >"+analyser.frequencyBinCount);
	console.log("audioCtx.sampleRate >"+audioCtx.sampleRate);
	console.log("eqNodeCount >"+eqNodeCount);
	console.log("FMax >"+fMax);
	console.log("fBinWidth >"+fBinWidth);
	
	// Mic media stream
	navigator.mediaDevices.getUserMedia(audioConstraints)
	.then(function(mediaStream) {
		micSource = audioCtx.createMediaStreamSource(mediaStream);
		micSourceOK=true;
		micSource.connect(gainNodeIp);	//We start in live mode so connect it
		console.log("Mic Access OK");
	})
	.catch(function(err) { console.log(err.name + ": " + err.message); alert("No Microphone Available");});
	
	//Connect the audio nodes together
	gainNodeIp.connect(analyser);
	analyser.connect(gainNodeOp);
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
			this.innerText = "Live Mode";
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
				micSource.connect(gainNodeIp);
				//samplingButton.style.display='inline';
				selectButton.disabled=true;
				selectButton.style.backgroundColor = "#8c8c8c";
				liveButton.innerText = "Play Mode";
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
				samplingStart();
			}
    }, false);

    audio.addEventListener('pause', function(evt) {
	console.log("Sampling Stop")
	selectButton.disabled=false;
        if(sampling) {
			samplingStop();
		}
    }, false);

    samplingButton.addEventListener('click', function(evt) {
        if(!sampling) {
			if(live){
				samplingStart();
			}else{
				if (audioLoaded){
					samplingStart();
					audio.play();
				}else{
					alert("Please select a file first");
				}
			}
        } else {
			samplingStop();
			if (!live && audioLoaded){
				audio.pause();
			}
	}
    });

    samplingInterval = sampleInterval.value * 1000;
}


function samplingStart(){
    sampling = true;
	sampleNum=0;
    createSamples();
    samplingButton.innerHTML = "<i class=\"fa fa-volume-off\" aria-hidden=\"true\"></i> Stop Sampling";
    samplingButton.style.backgroundColor = "#aa4b46";
    liveButton.style.backgroundColor = "#8c8c8c";
    liveButton.disabled=true;
    //setupButton.style.backgroundColor = "#8c8c8c";
    //setupButton.disabled=true;
    selectButton.style.backgroundColor = "#8c8c8c";
    selectButton.disabled=true;
    selectButton.style.cursor="default";
}

function samplingStop(){ 
    sampling = false;
    clearSamples();
    samplingButton.innerHTML = "<i class=\"fa fa-volume-off\" aria-hidden=\"true\"></i> Start Sampling";
    samplingButton.style.backgroundColor = "#66aa5d";
    liveButton.style.backgroundColor = "#66aa5d";
    liveButton.disabled=false;
    //setupButton.style.backgroundColor = "#66aa5d";
    //setupButton.disabled=false;
    selectButton.style.backgroundColor = "#66aa5d";
    selectButton.disabled=false;
    selectButton.style.cursor="pointer";
}


function createSamples() {
    console.log("Initialising sample, sampling at >" + samplingInterval + " millis. ipThreshold >" + ipThreshold);
	
	clearSamples();
    sampleLoop = setInterval(function () {
		
		processingBells = true;
        if(bellSamples) {
            sampleToRequest(bellSamples);
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
		request.post(BELL_SERVER + '/strike').json(JSONArray);
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
	var numDataPoints = analyser.frequencyBinCount - bassSkip;
	var freqData = new Uint8Array(numDataPoints);
	var ctxFreqD = canvasFreqD.getContext('2d');
	var drawThreshold; 
	var numSpacers = numDataPoints;
	var numCells = numDataPoints + Math.round(numSpacers / 2);
	var barWidth = Math.round (canvasWidth / numCells);
	var spacerWidth = Math.round (barWidth / 2);
	var magnitude = [];
	
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
		if (i > Math.floor((numDataPoints/bells) * bellNumber)){
			if (!processingBells){
				bellSamples.push(Math.floor(magnitude[i]/10));
			}
			//ctxFreqD.fillStyle = '#000000';
			bellNumber++;
		}else{
			//ctxFreqD.fillStyle = '#F6D565';
		}
		if (magnitude[i] > drawThreshold){
			ctxFreqD.fillStyle = '#b37700'
			ctxFreqD.fillRect(i * (spacerWidth + barWidth), canvasHeight, barWidth, -magnitude[i]);
		} else {
			ctxFreqD.fillStyle = '#F6D565';
			ctxFreqD.fillRect(i  * (spacerWidth + barWidth), canvasHeight, barWidth, -magnitude[i]);
		}
	}
};

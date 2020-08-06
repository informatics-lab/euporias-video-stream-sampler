'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
const liveX=600;
const liveY=400;

var request = require('request');
var requestPromise	= require('request-promise-native');

var stream;
var streamOK = false;

var largeGridDim, smallGridDim;
var sampling = false;
var recording = false;
var playing = false;
var videoLoaded = false;
var live = true;
var threshold = 5;
var samplingInterval, sampleLoop, sample, sampleDiv;
var video, videoCanvas, videoCanvasCtx;
var URL=window.URL;
var fileURL;


var liveButton 		= document.getElementById('live-button');
var samplingButton 	= document.getElementById('sampling-button');
var selectLabel 	= document.getElementById('select-label');
var selectButton	= document.getElementById('select-button');
var video 			= document.getElementById('vid');
var videoCanvas 	= document.getElementById('videoCanvas');
var recordingButton = document.getElementById('record-button');
var recordingName	= document.getElementById('rec-name');
var vidX=liveX;
var vidY=liveY;


/****/
const HOME_PAGE         = 'index.html';                     //homepage
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
initVideo();


function initVideo() {
	console.log ("initVideo")
	getMediaStream();

    video = document.getElementById('vid');
    video.width = liveX;
    video.height = liveY;
    videoCanvas.width = liveX;
    videoCanvas.height = liveY;

    videoCanvasCtx = videoCanvas.getContext('2d');

    setInterval(function () {
        videoCanvasCtx.clearRect(0, 0, liveX, liveY);
        videoCanvasCtx.drawImage(video, 0, 0, liveX, liveY, 0, 0, liveX, liveY);
    }, CAMERA_FRAME_RATE);
}

function initControls() {
    var dim1 = document.getElementById('grid-dim-1');
    var dim2 = document.getElementById('grid-dim-2');
    var sampleInterval = document.getElementById('sample-interval');
    var sampleThreshold = document.getElementById('sample-threshold');
    var selRecButton = document.getElementById('select-button');

	console.log ("initControls")

	bhPageStart();
	initCommonControls();
	
    dim1.addEventListener('change', function (evt) {
		statusUpdate("Changed Dimensions")
        var value1 = evt.target.value;
        var value2 = dim2.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples(liveX,liveY);
        }
    });

    dim2.addEventListener('change', function (evt) {
		statusUpdate("Changed Dimensions")
        var value2 = evt.target.value;
        var value1 = dim1.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples(liveX,liveY);
        }
    });

    sampleInterval.addEventListener('change', function (evt) {
		statusUpdate("Changed Interval")
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamples(liveX,liveY);
        }
    });

    sampleThreshold.addEventListener('change', function(evt){
		statusUpdate("Changed Threshold")
		var value = evt.target.value;
        threshold = value;
        if(sampling) {
            createSamples(liveX,liveY);
        }
    });

	liveButton.addEventListener('click',function(evt){
	if(live) {
	    live = false;
	    videoCanvas.style.display="none";
	    video.style.display="inline";
		video.srcObject = null;
	    if (videoLoaded){
	        video.src = fileURL;
	    	video.setAttribute("controls",true);
	    }
	    samplingButton.style.display="none";
	    selectLabel.style.display="inline";
	    this.innerText = "Live Mode";
	} else {
		console.log("liveButton event listener switching to live mode");
		if (! streamOK){
			statusUpdate ("No Webcam Access");
		}else{
			live = true;
			videoCanvas.style.display="inline";
			video.style.display="none";
			video.removeAttribute("controls");
			video.src = null;
			getMediaStream();
			video.srcObject = stream;
			video.play();
			samplingButton.style.display='inline';
			selectLabel.style.display="none";
			this.innerText = "Video Mode";
		}
	}
    });

	video.addEventListener('play', function(evt) {
		console.log("video event listener start");
        if(!sampling && !live) {		//video playing only 
			samplingStart(vidX,vidY);
			pageEnable(false)
		}
    }, false);

    video.addEventListener('pause', function(evt) {
		console.log("video event listener pause");
        if(sampling && !live) {					//video playing only
			samplingStop();
			if (bhStarted) pageEnable(true);
		}
    }, false);

    video.addEventListener('loadedmetadata' , function(evt) {
		vidX = this.videoWidth;
		vidY = this.videoHeight;
    }, false);	
    
    samplingButton.addEventListener('click', function(evt) {
        if(!sampling) {
			samplingStart(liveX,liveY);
			//pageEnable(false)
        } else {
			samplingStop();
			//pageEnable(true)
		}
    });


   selRecButton.addEventListener('change', function(evt) {
	var file = this.files[0];
	var type = file.type;
    fileURL = URL.createObjectURL(file);
	console.log("fileURL >"+fileURL);
	video.src = fileURL;
	videoLoaded = true;
	video.setAttribute("controls",true);
    });
        

    homeButton.addEventListener('click', function(evt){
        window.location.href=HOME_PAGE;
    });
	
    sampleDiv = document.getElementById('samples');
    setGridDims(dim1.value, dim2.value);
    samplingInterval = sampleInterval.value * 1000;
}

function getMediaStream(){ 
	navigator.mediaDevices.getUserMedia({audio: false, video: true})
	.then(function (mediaStream){
		streamOK = true;
		video.srcObject = mediaStream;
			video.play();

		video.onloadedmetadata = function(e) {
			video.play();
		};
	})
	.catch(function(err) { 
		streamOK = false;
		console.log(err.name + ": " + err.message); 
	});
}
function samplingStart(x,y){
	console.log("Sampling Start");
	video.play();
	console.log("samplingStart");
    sampling = true;
    createSamples(x,y);
    samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Stop Sampling";
}

function samplingStop(){ 
//	video.pause();
	console.log("Sampling Stop");
    sampling = false;
    clearSamples();
    samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Start Sampling";
	statusUpdate("Sampling Stopped");
}

function setGridDims(val1, val2) {
    if (val1 > val2) {
        largeGridDim = val1;
        smallGridDim = val2
    } else {
        largeGridDim = val2;
        smallGridDim = val1;
    }
}

function createSamples(maxX,maxY) {
    console.log("Initialising sample, sampling at " + samplingInterval + " millis");
	statusUpdate("Getting New Samples ")

    clearSamples();

    var clickPattern = {
                            topLeft: {
                                x : 0,
                                y : 0
                            },
                            bottomRight : {
                                x : maxX,
                                y : maxY
                            }
                        };

    var grid = getSampleGrid(clickPattern);
    sampleDiv.setAttribute('style', 'width:' + (grid.totalWidth + (grid.numColumns * 8)) + "px");
    var sampleContexts = [];
    for (var i = 0; i < grid.numCells; i++) {
        var sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = grid.cellWidth;
        sampleCanvas.height = grid.cellHeight;
        sampleContexts.push(sampleCanvas.getContext('2d'));
        sampleDiv.appendChild(sampleCanvas);
    }

    sampleLoop = setInterval(function () {

        if (sample) {
            sample = {
                previous: sample.current,
                current: [],
                diff: []
            };
        } else {
            sample = {
                current: []
            };
        }

        var i = 0;
        sampleContexts.forEach(function (ctx) {
            ctx.clearRect(0, 0, grid.cellWidth, grid.cellHeight);
            ctx.drawImage(video,
                grid.sampleCoordOrigins[i].x,
                grid.sampleCoordOrigins[i].y,
                grid.cellWidth,
                grid.cellHeight,
                0,
                0,
                grid.cellWidth,
                grid.cellHeight);

            var sampleData = videoCanvasCtx.getImageData(grid.sampleCoordOrigins[i].x,
                grid.sampleCoordOrigins[i].y,
                grid.cellWidth,
                grid.cellHeight);

            sample.current.push(evaluateData(sampleData));

            if (sample.previous) {
                sample.diff.push(sample.current[i] - sample.previous[i]);
            }
            i++;
        });

        // we now have our complete sample data
        // if diff number is positive cell pixels have become lighter
        // if diff number is negative cell pixels have become darker
        if(sample.diff) {
            sampleToRequest(sample.diff);
            //console.log("DIFF:\n",sample.diff);
        }else{
			statusUpdate("No Changes Yet ");
		}
    }, samplingInterval);

};

function evaluateData(data) {
    function add(a, b) {
        return a + b;
    }

    return data.data.reduce(add, 0) / data.data.length;
}

function clearSamples() {
    while (sampleDiv.hasChildNodes()) {
        sampleDiv.removeAttribute('style');
        sampleDiv.removeChild(sampleDiv.lastChild);
    }
    if (sampleLoop) {
        clearInterval(sampleLoop)
    }
    if (sample) {
        sample = {};
    }
}

function getSampleGrid(clickPattern) {

    var originX = clickPattern.topLeft.x;
    var originY = clickPattern.topLeft.y;
    var totalWidth = clickPattern.bottomRight.x - clickPattern.topLeft.x;
    var totalHeight = clickPattern.bottomRight.y - clickPattern.topLeft.y;

    var rows, columns, cellWidth, cellHeight;

    if (totalWidth > totalHeight) {
        //landscape
        rows = smallGridDim;
        columns = largeGridDim;
    } else {
        //portrait
        rows = largeGridDim;
        columns = smallGridDim;
    }

    cellWidth = Math.floor(totalWidth / columns);
    cellHeight = Math.floor(totalHeight / rows);

    var sampleCoordOrigins = [];
    for (var i = 0; i < rows; i++) {
        var y = originY + (i * cellHeight);
        for (var j = 0; j < columns; j++) {
            var x = originX + (j * cellWidth);
            var coord = {
                x: x,
                y: y
            };
            sampleCoordOrigins.push(coord);
        }
    }

    return {
        originX: originX,
        originY: originY,
        totalWidth: totalWidth,
        totalHeight: totalHeight,
        numRows: rows,
        numColumns: columns,
        numCells: rows * columns,
        cellWidth: cellWidth,
        cellHeight: cellHeight,
        sampleCoordOrigins: sampleCoordOrigins
    };
}

function sampleToRequest(sampleArray) {
    var JSONArray = [];
    sampleArray.forEach(function (sample, index) {
        if(Math.abs(sample) > threshold) {
            JSONArray.push(index);
        }
    });
	//HERE Request Promise and show the result
    if(JSONArray.length > 0) {
        request.post(bhAddr + '/strike').json(JSONArray);
		statusUpdate("Striking " + JSONArray.length + " Bells");
		console.log('json : ',(JSONArray));
    }else{
		statusUpdate("No Bells To Strike");
	}
}

function listRecordings() {
    request(BELL_SERVER+'/records', function(error, response, body) {
        var recordSelector = document.getElementById('records-list');
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
	buttonState(selectLabel,enable);
	buttonState(selectButton,enable);
	buttonState(recordingButton,enable);
	buttonState(recordingName,enable);
	video.setAttribute("controls",enable);
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
				if (!live){
					video.pause();
				}else if (sampling){
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
				if (live){
					video.play();
				}
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






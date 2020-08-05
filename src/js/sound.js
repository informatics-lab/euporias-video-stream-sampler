'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
//const BELL_SERVER = "http://bellhouse.eu.ngrok.io";
const BELL_SERVER = "http://0.0.0.0:5000";	//Testing
const liveX=600;
const liveY=400;
//const BELL_SERVER = "http://192.168.1.102:5000"


var request = require('request');

var stream;

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


var liveButton = document.getElementById('live-button');
var setupButton = document.getElementById('setup-button');
var samplingButton = document.getElementById('sampling-button');
var selectLabel = document.getElementById('select-label');
var video = document.getElementById('vid');
var videoCanvas = document.getElementById('videoCanvas');
var vidX=liveX;
var vidY=liveY;


//QAD pass of server address to following pages
//sessionStorage.setItem('BELL_SERVER',BELL_SER|VER);

/*Setup event listeners for controls on homepage */
initControls();
initVideo();


function initVideo() {
    //video = document.createElement('video');
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
    var recordingButton = document.getElementById('record-button');
    var playRecordingButton = document.getElementById('play-record-button')
    var selRecButton = document.getElementById('select-button');


    //alert("Test Page, not linked to ngrok");
    dim1.addEventListener('change', function (evt) {
        var value1 = evt.target.value;
        var value2 = dim2.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples(liveX,liveY);
        }
    });

    dim2.addEventListener('change', function (evt) {
        var value2 = evt.target.value;
        var value1 = dim1.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples(liveX,liveY);
        }
    });

    sampleInterval.addEventListener('change', function (evt) {
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamples(liveX,liveY);
        }
    });

    sampleThreshold.addEventListener('change', function(evt){
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
	    if (videoLoaded){
	        video.src = fileURL;
	    	video.setAttribute("controls",true);
	    }
	    samplingButton.style.display="none";
	    selectLabel.style.display="inline";
	    this.innerText = "Live Mode";
	} else {
	    live = true;
	    videoCanvas.style.display="inline";
	    video.style.display="none";
	    video.removeAttribute("controls");
	    navigator.webkitGetUserMedia({audio: false, video: true}, handleSuccess, handleError);
	    samplingButton.style.display='inline';
	    selectLabel.style.display="none";
	    this.innerText = "Video Mode";
	}
    });

    selRecButton.addEventListener('change', function(evt) {
	var file = this.files[0];
	var type = file.type;
        fileURL = URL.createObjectURL(file);
	video.src = fileURL;
	videoLoaded = true;
	video.setAttribute("controls",true);
        console.log(video.src);
    });
        
    video.addEventListener('play', function(evt) {
	selRecButton.disabled=true;
        if(!sampling) {
	    samplingStart(vidX,vidY);
	}
    }, false);

    video.addEventListener('pause', function(evt) {
	selRecButton.disabled=false;
        if(sampling) {
	    samplingStop(liveX,liveY);
	}
    }, false);

    video.addEventListener('loadedmetadata' , function(evt) {
 	vidX = this.videoWidth;
	vidY = this.videoHeight;
    }, false);	
    
    samplingButton.addEventListener('click', function(evt) {
        if(!sampling) {
	    samplingStart(liveX,liveY);
        } else {
	    samplingStop();
	}
    });

    recordingButton.addEventListener('click', function(evt) {
       if(!recording) {
           var recordName = prompt("Please enter a name for this recording");
           request
               .post(BELL_SERVER+'/recording')
               .json({record_filename: recordName})
               .on('response', function(response) {
                   alert("Now Recording...");
                   recording = true;
                   recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Stop Recording";
               });
       } else {
           request
               .get(BELL_SERVER+'/recording/stop')
               .on('response', function(response) {
                    alert("Recording Stopped");
                    recording = false;
                   recordingButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i> Start Recording";
                });
                listRecordings();
       }
    });

    playRecordingButton.addEventListener('click', function(evt) {
        if(!playing) {
            var record = document.getElementById('records-list').value;
            request
                .get(BELL_SERVER+'/records/'+record.replace('.json', '')+'/play')
                .on('response', function(response) {
                    playRecordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i>";
                    playing = true;
                });
        } else {
            request
                .get(BELL_SERVER+'/records/stop')
                .on('response', function(response) {
                     playRecordingButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i>";
                     playing = false;
            });
        }
    });

    setupButton.addEventListener('click', function(evt) {
    	window.location.href="setup.html";
    });


    listRecordings();
    sampleDiv = document.getElementById('samples');
    setGridDims(dim1.value, dim2.value);
    samplingInterval = sampleInterval.value * 1000;
}


function samplingStart(x,y){
    sampling = true;
    createSamples(x,y);
    samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Stop Sampling";
    samplingButton.style.backgroundColor = "#aa4b46";
    liveButton.style.backgroundColor = "#8c8c8c";
    liveButton.disabled=true;
    setupButton.style.backgroundColor = "#8c8c8c";
    setupButton.disabled=true;
    selectLabel.style.backgroundColor = "#8c8c8c";
    selectLabel.disabled=true;
    selectLabel.style.cursor="default";
}

function samplingStop(){ 
    sampling = false;
    clearSamples();
    samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Start Sampling";
    samplingButton.style.backgroundColor = "#66aa5d";
    liveButton.style.backgroundColor = "#66aa5d";
    liveButton.disabled=false;
    setupButton.style.backgroundColor = "#66aa5d";
    setupButton.disabled=false;
    selectLabel.style.backgroundColor = "#66aa5d";
    selectLabel.disabled=false;
    selectLabel.style.cursor="pointer";
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
            console.log("DIFF:\n",sample.diff);
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

function handleSuccess(stream) {
    //video.src = window.URL.createObjectURL(stream);
    stream = window.URL.createObjectURL(stream);
    video.src = stream;
}

function handleError(error) {
    console.log('user media error: ', error);
}

function sampleToRequest(sampleArray) {
    var JSONArray = [];
    sampleArray.forEach(function (sample, index) {
        if(Math.abs(sample) > threshold) {
            JSONArray.push(index);
        }
    });
    if(JSONArray.length > 0) {
        request.post(BELL_SERVER + '/strike').json(JSONArray);
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


navigator.webkitGetUserMedia({audio: false, video: true}, handleSuccess, handleError);

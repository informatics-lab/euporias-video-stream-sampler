'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
const STRIKE_THRESHOLD = 5.0;
const BELL_SERVER = "http://192.168.1.2:5000";


var request = require('request');

var largeGridDim, smallGridDim;
var sampling = false;
var recording = false;
var samplingInterval, sampleLoop, sample, sampleDiv;
var video, videoCanvas, videoCanvasCtx;

initControls();
initVideo();

function initVideo() {
    video = document.createElement('video');
    video.width = 600;
    video.height = 400;
    videoCanvas = document.getElementById('videoCanvas');
    videoCanvas.width = 600;
    videoCanvas.height = 400;

    videoCanvasCtx = videoCanvas.getContext('2d');

    setInterval(function () {
        videoCanvasCtx.clearRect(0, 0, 600, 400);
        videoCanvasCtx.drawImage(video, 0, 0, 600, 400, 0, 0, 600, 400);
    }, CAMERA_FRAME_RATE);
}

function initControls() {
    var dim1 = document.getElementById('grid-dim-1');
    var dim2 = document.getElementById('grid-dim-2');
    var sampleInterval = document.getElementById('sample-interval');
    var samplingButton = document.getElementById('sampling-button');
    var recordingButton = document.getElementById('record-button');
    
    dim1.addEventListener('change', function (evt) {
        var value1 = evt.target.value;
        var value2 = dim2.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples();
        }
    });

    dim2.addEventListener('change', function (evt) {
        var value2 = evt.target.value;
        var value1 = dim1.value;
        setGridDims(value1, value2);
        if (sampling) {
            createSamples();
        }
    });

    sampleInterval.addEventListener('change', function (evt) {
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampling) {
            createSamples();
        }
    });

    samplingButton.addEventListener('click', function(evt) {
        if(!sampling) {
            sampling = true;
            createSamples();
            samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Stop Sampling";
            samplingButton.style.backgroundColor = "#aa4b46";
        } else {
            sampling = false;
            clearSamples();
            samplingButton.innerHTML = "<i class=\"fa fa-video-camera\" aria-hidden=\"true\"></i> Start Sampling";
            samplingButton.style.backgroundColor = "#66aa5d";

        }
    });

    recordingButton.addEventListener('click', function(evt) {
       if(!recording) {
           var recordName = prompt("Please enter a name for this recording");
           request
               .post(BELL_SERVER+'/record')
               .json({record_filename: recordName})
               .on('response', function(response) {
                   alert("Now Recording...");
                   recording = true;
                   recordingButton.innerHTML = "<i class=\"fa fa-stop-circle\" aria-hidden=\"true\"></i> Stop Recording";
               });
       } else {
           request
               .get(BELL_SERVER+'/record/stop')
               .on('response', function(response) {
                    alert("Recording Stopped");
                    recording = false;
                   recordingButton.innerHTML = "<i class=\"fa fa-play-circle\" aria-hidden=\"true\"></i> Start Recording";
                });
       }
    });

    sampleDiv = document.getElementById('samples');
    setGridDims(dim1.value, dim2.value);
    samplingInterval = sampleInterval.value * 1000;
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

function createSamples() {
    console.log("Initialising sample, sampling at " + samplingInterval + " millis");

    clearSamples();

    var clickPattern = {
                            topLeft: {
                                x : 0,
                                y : 0
                            },
                            bottomRight : {
                                x : 600,
                                y : 400
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
    video.src = window.URL.createObjectURL(stream);
}

function handleError(error) {
    console.log('user media error: ', error);
}

function sampleToRequest(sampleArray) {
    var JSONArray = [];
    sampleArray.forEach(function (sample, index) {
        if(Math.abs(sample) > STRIKE_THRESHOLD) {
            JSONArray.push(index);
        }
    });
    request.post(BELL_SERVER+'/strike').json(JSONArray);
}

navigator.webkitGetUserMedia({audio: false, video: true}, handleSuccess, handleError);
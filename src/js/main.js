'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
const STRIKE_THRESHOLD = 5.0;

var request = require('request');

var largeGridDim, smallGridDim;
var mouseIsDown = 0;
var click, release;
var startX, startY, endX, endY;
var samplingInterval, sampleLoop, sample, sampleDiv;
var video, videoCanvas, videoCanvasCtx

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
    videoCanvas.addEventListener('mousedown', mouseDown, false);
    videoCanvas.addEventListener('mouseup', mouseUp, false);
    videoCanvas.addEventListener("mousemove", mouseXY, false);

    setInterval(function () {
        videoCanvasCtx.clearRect(0, 0, 600, 400);
        videoCanvasCtx.drawImage(video, 0, 0, 600, 400, 0, 0, 600, 400);
        drawSquare();
    }, CAMERA_FRAME_RATE);
}

function initControls() {
    var dim1 = document.getElementById('grid-dim-1');
    var dim2 = document.getElementById('grid-dim-2');
    var sampleInterval = document.getElementById('sample-interval');

    dim1.addEventListener('change', function (evt) {
        var value1 = evt.target.value;
        var value2 = dim2.value;
        setGridDims(value1, value2);
        if (release) {
            createSamples();
        }
    });

    dim2.addEventListener('change', function (evt) {
        var value2 = evt.target.value;
        var value1 = dim1.value;
        setGridDims(value1, value2);
        if (release) {
            createSamples();
        }
    });

    sampleInterval.addEventListener('change', function (evt) {
        var value = evt.target.value;
        samplingInterval = value * 1000;
        if (sampleLoop) {
            createSamples();
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

    var clickPattern = getClickPattern(click, release);
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
        // console.log(sample.diff);
        sampleToRequest(sample.diff);

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

function getClickPattern(click, release) {

    var topLeft = {x: null, y: null};
    var bottomRight = {x: null, y: null};

    if (click.offsetX < release.offsetX) {
        topLeft.x = click.offsetX;
        bottomRight.x = release.offsetX;
    } else {
        topLeft.x = release.offsetX;
        bottomRight.x = click.offsetX;
    }

    if (click.offsetY < release.offsetY) {
        topLeft.y = click.offsetY;
        bottomRight.y = release.offsetY;
    } else {
        topLeft.y = release.offsetY;
        bottomRight.y = click.offsetY;
    }

    return {
        topLeft: topLeft,
        bottomRight: bottomRight
    };
}

function mouseDown(eve) {
    mouseIsDown = 1;
    var pos = getMousePos(videoCanvas, eve);
    startX = endX = pos.x;
    startY = endY = pos.y;
    drawSquare(); //update
    click = eve;
}

function mouseUp(eve) {
    if (mouseIsDown !== 0) {
        mouseIsDown = 0;
        var pos = getMousePos(videoCanvas, eve);
        endX = pos.x;
        endY = pos.y;
        drawSquare(); //update on mouse-up
    }
    release = eve;
    createSamples();
}

function mouseXY(eve) {

    if (mouseIsDown !== 0) {
        var pos = getMousePos(videoCanvas, eve);
        endX = pos.x;
        endY = pos.y;

        drawSquare();
    }
}

function drawSquare() {
    // creating a square
    if (startX && startY && endX && endY) {


        var w = endX - startX;
        var h = endY - startY;
        var offsetX = (w < 0) ? w : 0;
        var offsetY = (h < 0) ? h : 0;
        var width = Math.abs(w);
        var height = Math.abs(h);

        // videoCanvasCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

        videoCanvasCtx.beginPath();
        videoCanvasCtx.rect(startX + offsetX, startY + offsetY, width, height);
        // videoCanvasCtx.fillStyle = "yellow";
        // videoCanvasCtx.opacity = 0.6;
        // videoCanvasCtx.fill();
        videoCanvasCtx.lineWidth = 3;
        videoCanvasCtx.strokeStyle = 'blue';
        videoCanvasCtx.stroke();
    }
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
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
    console.log(JSONArray);
    request.post('http://192.168.1.2:5000/strike').json(JSONArray);
}

navigator.webkitGetUserMedia({audio: false, video: true}, handleSuccess, handleError);
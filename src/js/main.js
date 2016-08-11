'use strict';

const SAMPLING_INTERVAL = 3000;
const CAMERA_FRAME_RATE = 1000 / 20;
const LARGE_GRID_DIM = 8;
const SMALL_GRID_DIM = 6;

var click, release;
var sampleLoop, sample;
var contentDiv = document.getElementById('content');

var video = document.createElement('video');
video.width = 600;
video.height = 400;
var videoCanvas = document.createElement('canvas');
videoCanvas.width = 600;
videoCanvas.height = 400;
contentDiv.appendChild(videoCanvas);

var sampleDiv = document.createElement('div');
sampleDiv.id = 'samples';
contentDiv.appendChild(sampleDiv);

var videoCanvasCtx = videoCanvas.getContext('2d');
videoCanvas.addEventListener('mousedown', function (evt) {
    console.log("click", evt);
    click = evt;
});
videoCanvas.addEventListener('mouseup', function (evt) {
    console.log("release", evt);
    release = evt;
    createSamples();
});
setInterval(function () {
    videoCanvasCtx.clearRect(0, 0, 600, 400);
    videoCanvasCtx.drawImage(video, 0, 0, 600, 400, 0, 0, 600, 400);
}, CAMERA_FRAME_RATE);


function createSamples() {
    console.log("Initialising sample");

    clearSamples();

    var clickPattern = getClickPattern(click, release);
    var grid = getSampleGrid(clickPattern);

    var sampleContexts = [];
    for (var i = 0; i < grid.numCells; i++) {
        var sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = grid.cellWidth;
        sampleCanvas.height = grid.cellHeight;
        sampleContexts.push(sampleCanvas.getContext('2d'));
        sampleDiv.appendChild(sampleCanvas);
    }

    sampleLoop = setInterval(function () {

        if(sample) {
            sample = {
                previous : sample.current,
                current : [],
                diff : []
            };
        } else {
            sample = {
                current : []
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

            if(sample.previous) {
                sample.diff.push(sample.current[i] - sample.previous[i]);
            }
            i++;
        });

        // we now have our complete sample data
        // if diff number is positive cell pixels have become lighter
        // if diff number is negative cell pixels have become darker
        console.log(sample);

    }, SAMPLING_INTERVAL);

};

function evaluateData(data) {
    function add(a, b) {
        return a + b;
    }
    return data.data.reduce(add, 0);
}

function clearSamples() {
    while (sampleDiv.hasChildNodes()) {
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
        rows = SMALL_GRID_DIM;
        columns = LARGE_GRID_DIM;
    } else {
        //portrait
        rows = LARGE_GRID_DIM;
        columns = SMALL_GRID_DIM;
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

function handleSuccess(stream) {
    video.src = window.URL.createObjectURL(stream);
}

function handleError(error) {
    console.log('user media error: ', error);
}

navigator.webkitGetUserMedia({audio: false, video: true}, handleSuccess, handleError);
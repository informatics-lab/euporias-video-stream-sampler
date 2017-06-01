'use strict';
const CAMERA_FRAME_RATE = 1000 / 20;
const BELL_SERVER = "http://192.168.1.83:5000";

var $           = require("jquery");
var request     = require('request');

/*Setup event listeners for controls on setup page */
initSetupPage();



/*Setup event listeners for controls on bell setup page*/
function initSetupPage(){
    var homeButton = document.getElementById('home-button');

    homeButton.addEventListener('click', function(evt) {
       console.log('Clicked done');
       window.location.href="index.html"
    });

    getServos();

}

function getServos() {
    var servos = document.getElementById('servos');
    $.ajax({
            url: 'http://bellhouse.eu.ngrok.io/servos',
            method: 'GET'
        }).then(function(response) {
            console.log("got a response");
            $.each(response, function(i, resultset){
                console.log(i + ": " + resultset);
                $.each(resultset, function(i, result){
                    console.log(i + ": " + result);
                    var listItem = document.createElement("li");
                    var listItemText = document.createTextNode("id: " + result.id + ", rotate by degrees: " + result.rotate_to_deg);
                    listItem.appendChild(listItemText);
                    servos.appendChild(listItem);
                });
            });
        });
};

const CONFIG_PATH	 	= "./bellhouse";
const KEY_CONFIG_IPADDR = "ipAddr";
const KEY_CONFIG_PWD	= "pwd";
var requestPromise	= require('request-promise-native');

var objConfig = {
	ipAddr : "",
	pwd : ""
	}
exports.objConfig;
module.exports.objConfig  = {
	ipAddr : "",
	pwd : "",
	stat : ""
	}
//exports.objConfig;

exports.readSysConfig = function(config){
	console.log("readSysConfig");
	try{
		if (typeof localStorage === "undefined" || localStorage === null) {
		  var LocalStorage = require('node-localstorage').LocalStorage;
		  localStorage = new LocalStorage(CONFIG_PATH);
		}
		config.ipAddr = localStorage.getItem(KEY_CONFIG_IPADDR);
		config.pwd = localStorage.getItem(KEY_CONFIG_PWD);
		config.stat = "OK";
		console.log(config);
		return(config);
	}catch(err){
		if (err.name === "SecurityError"){
			config.stat = "Unreadable";
			return(config);
		}else{
			config.stat = "Error"; 
			console.log("Error  >" + err);
			return(config);
		}
	} 
}
exports.writeSysConfig = function(config){
	console.log("writeSysConfig");
	console.log(config);
	try{
		if (typeof localStorage === "undefined" || localStorage === null) {
		  var LocalStorage = require('node-localstorage').LocalStorage;
		  localStorage = new LocalStorage(configKey);
		}	 
		localStorage.setItem(KEY_CONFIG_IPADDR, config.ipAddr);
		localStorage.setItem(KEY_CONFIG_PWD, config.pwd);
	}catch(err){
		if (err.name === "SecurityError"){
			return("Unreadable");
		}else{
			console.log("Error  >" + err);
			return("Error");
		}
	} 
}
exports.testStarted = function(bhAddr){
	console.log("testStarted");
	//Force to read from BH not cache
	return requestPromise(
		{ 
			url : bhAddr + '/' , 
			json : true,
			headers : {
				'Cache-Control' : 'private, no-cache, no-store, must-revalidate max-age=0'
			}
		}
	).then (function (response) {
		console.log ("testStarted : response.started >" + response.started);
		console.log("response follows ");
		console.log(response);
		return(response.started);
	}).catch (function (err){
		console.log('ERROR : testStarted : ',err);
		if (err.message === 'TypeError: Failed to fetch'){
			console.log ('returning null');
			return(null);
		}else{
			console.log('Error was unexpected, throwing it again');
			throw(err);
	//		return(false);
		}
	});
}
exports.isRecording = function(bhAddr){
	console.log("isRecording");
	//Force to read from BH not cache
	return requestPromise(
		{ 
			url : bhAddr + '/isrecording' , 
			json : true,
			headers : {
				'Cache-Control' : 'private, no-cache, no-store, must-revalidate max-age=0'
			}
		}
	).then (function (response) {
		console.log ("isRecording : response.started >" + response.recording);
		console.log("response follows ");
		console.log(response);
		return(response.recording);
	}).catch (function (err){
		console.log('ERROR : isRecording : ',err);
		if (err.message === 'TypeError: Failed to fetch'){
			console.log ('returning null');
			return(null);
		}else{
			console.log('Error was unexpected, throwing it again');
			throw(err);
	//		return(false);
		}
	});
}

exports.bhNumBells = function(bhAddr){
	console.log("bhNumBells");
	//Force to read from BH not cache
	return requestPromise(
		{ 
			url : bhAddr + '/servocount' , 
			json : true,
			headers : {
				'Cache-Control' : 'private, no-cache, no-store, must-revalidate max-age=0'
			}
		}
	).then (function (response) {
		console.log ("bhNumBells : response.servocount >" + response.servocount);
		return(response.servocount);
	}).catch (function (err){
		console.log('ERROR : bhNumBells : ',err);
		if (err.message === 'TypeError: Failed to fetch'){
			console.log ('returning null');
			return(null);
		}else{
			console.log('Error was unexpected, throwing it again');
			throw(err);
	//		return(false);
		}
	});	
}
exports.bhStart = function(bhAddr){
	console.log("Starting BellHouse");
	return requestPromise (
		{ url : bhAddr + '/start' }
	).then (function (response) {
		console.log ("bhStart /start >" + response);
		return requestPromise (
			{ url : bhAddr + '/loadconf' }
		);
	}).catch (function (err){
		statusUpdate("Failed To Start...");statusBad('brown');
		console.log('ERROR : bhStart /start : ',err);
	});
}
exports.bhStop =function(bhAddr){
	//Put the bellhouse into Stopped mode. Return promise
	return requestPromise (
		{ url : bhAddr + '/stop' }
	)
}

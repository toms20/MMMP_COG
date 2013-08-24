//Lets keep the communication and scale funcitons seperate from the UI so we can create a text based UI

/**********************************************************/
/* Web worker creator that will be loaded along with HTML */
/**********************************************************
+ The purpose of this script
	- Create a web-worker (asyncrenous thread) to handle all COM aspects of the site 
	- It's important to offload as much work as possible because we have a graphically intensive UI
	- Therefore the web-worker will only respond when there is a UI update needed
	- This script will have access to all the functions of the UI script
*/
var isConnected = false;
var debug = true;
var isWorkerSupported = true;

console.log(typeof(WebSocket));
console.log(typeof(MozWebSocket));

function initiateCommunication() {
	console.log('initiateCommunication called');
	if(!isConnected) {
		if(typeof(Worker) !== 'undefined') {
			//Check to see if our web-worker exists
			if(typeof(ww) == 'undefined') {
				//No Web-Worker so create one
				console.log('creating web worker')
				ww = new Worker('com_WW.js');
				initWebWorker();
			}
			//Post 'connection' message to web-worker
			post('init ws'); 
		} else {
			//web-workers aren't supported so let's default to a single thread
			isWorkerSupported = false;
		}
	} else {
		post('kill ws');
		// We are already connected...
		// Would you like me to terminate the current connection and re-connect? 
	}
}

function initWebWorker() {
	ww.onmessage = function(event) {
		handleWWMessage(event);
	}

	ww.onerror = function(event) {
		handleWWError(event);
	}

	window.onunload = function() {
		post('die');
	}

	//Implement other listeners here
}

function handleWWMessage(e) {
	console.log(e.data);
	switch(e.data[0]) {
		case 0:
			switch(e.data[1]) {
				case 'wsOpened':
					isConnected = true;
					break;
				case 'wsClosed':
					isConnected = false;
					break;
				case 'unsupported':
					isConnected = false;
					isWorkerSupported = false;
					initWebSocket();
					break;
			}
			break;
		case 1:
			//A function is being requested... construct it and call it;
			e.data[1](e.data[2]);
			break;
	}
	// this is just going to be a giant switch case or maybe i'll format the message with a 
	// key-value format to help determine the required action.

	// a key of 0 would inidcate a socket specific issue
	// a key of 1 would indicate -> funciton name, neccessary parameters
	// a key of 2 would be to just send a message or sumthin

	//have the webworker provide a conenciton callback so we can update out boolean
}

function testAlert(msg1, msg2) {
	alert("Msg1: "+msg1+"\nMsg2: "+msg2);
}

function handleWWError(e) {
	//log it out and handle it accordingly
	console.log('*** Web Worker Error ***');
	console.log('File:'+e.filename);
	console.log('Line:'+e.lineno);
	console.log('Msg:'+e.message);
	console.log('^^^^^^^^^^^^^^^^^^^^^^^^');

}

function post(msg) {
	if(debug) console.log('ww post - '+msg);
	if(ww) ww.postMessage(msg);
	else console.log('No Worker Available...');
}


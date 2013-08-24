var isLocationDefined = false;
var isAnimated = true;
var mainWeight = 300;
var weightVariance = mainWeight*.01;
var simulatingData = false;
var rearDist = .65;
var optimumFB = .65;
var leftDist = .50;
var optimumLR = .50;
var maxCellLoad = 200;
var lcData = [0,0,0,0,0];
var tareData = [0,0,0,0,0];
var isPollingLoadCells = false;
var avgFBDist = 0;
var avgLRDist = 0;

var myCOMObject;

//Load cell data -> lb
var conversion = .022/4;

//The initial function MUST be called initWeighToolPage
function initWeighToolPage() {
	console.log('Javascript initiated');
	bars = ['weightBarVal', 'loadBarValQ1', 'wheelBarValQ1', 'loadBarValQ2', 'wheelBarValQ2', 'loadBarValQ3', 'wheelBarValQ3', 'loadBarValQ4', 'wheelBarValQ4', 'distroBarValFB', 'distroBarValLR'];
	myCOMObject = new ArduinoCommunicationObject();
	myCOMObject.registerPinCallback(96, onLoadCellData);
	myCOMObject.registerPinCallback(97, onLoadCellData);
	myCOMObject.registerPinCallback(98, onLoadCellData);
	myCOMObject.registerPinCallback(99, onLoadCellData);
	// myCOMObject.isDebugging = false;

}

function btnConnect() {
	if(myCOMObject.isConnected) {
		document.getElementById('btnConnect').innerHTML = 'Connect';
		myCOMObject.stopPollingLoadCells();
		myCOMObject.closeWebSocket();
	} else {
		myCOMObject.initWebSocket();
		window.setTimeout(function() {
			myCOMObject.startPollingLoadCells();
			console.log('Timeout Called!');
		}, 3000);
		document.getElementById('btnConnect').innerHTML = 'Disconnect';
	}
}

function btnWeigh() {
	if(totWeight > 35) {
		alert('Total Weight\n'+(totWeight).toFixed(1)+'lb\n\nLeft-To-Right Distribution\n'+(avgLRDist*100).toFixed(0)+':'+((1-avgLRDist)*100).toFixed(0)+'\n\nFront-To-Back Distribution\n'+((1-avgFBDist)*100).toFixed(0)+':'+(avgFBDist*100).toFixed(0));
	}
}

function btnTare() {
	// tareData = lcData;
	console.log('Taring data');
	tareData[1] = lcData[1];
	tareData[2] = lcData[2];
	tareData[3] = lcData[3];
	tareData[4] = lcData[4];
}

function btnHelp() {
	console.log('help');
	alert("Step 1 - Press the 'Connect' button and wait 2-3 seconds\nStep 2 - Press the 'Tare' button if the scale doesn't read 0lb or 0kg\nStep 3 - Assist patient onto scale\nStep 4 - With the patient sitting still, press the 'Weigh' button to freeze the current data.");
}

function btnAnimate() {
	if(isAnimated) {
		for(i=0; i<bars.length; i++) {
			document.getElementById(bars[i]).className = document.getElementById(bars[i]).className + ' barAnimated';
		}
		isAnimated = false;
	} else {
		for(i=0; i<bars.length; i++) {
			document.getElementById(bars[i]).className = document.getElementById(bars[i]).className.replace(' barAnimated', '');
		}
		isAnimated = true;
	}
}

function onMessageFromArduino(data) {
	
}
	
var myLoadCellCounter = 0;

function onLoadCellData(data) {
	console.log('onLoadCellData Called');
	isPollingLoadCells = true;
	if(data['pin'] && data['value']) {
		var lcValue = data['value']*conversion;
		myLoadCellCounter++;
		if(lcValue >= 0) {
		switch(data['pin']) {
			// Note that the pin numbers and quadrant don't match up. This is because the 
			// address ports on the DAC is set up for a 90deg ratation when the tilting mechanism
			// is placed on top of the scale.
			case 96:
				lcData[1] = lcValue - tareData[1];
				if(lcData[1] < 0) lcData[1] = 0;
				document.getElementById('loadBarValQ4').style.width = (lcData[1]/maxCellLoad)*100+'%';
				document.getElementById('loadTextValQ4').innerHTML = (lcData[1]).toFixed(1)+'lb';
				break;
			case 97:
				lcData[2] = lcValue - tareData[2];
				if(lcData[2] < 0) lcData[2] = 0;
				document.getElementById('loadBarValQ1').style.width = (lcData[2]/maxCellLoad)*100+'%';
				document.getElementById('loadTextValQ1').innerHTML = (lcData[2]).toFixed(1)+'lb';
				break;
			case 98:
				lcData[3] = lcValue - tareData[3];
				if(lcData[3] < 0) lcData[3] = 0;
				document.getElementById('loadBarValQ2').style.width = (lcData[3]/maxCellLoad)*100+'%';
				document.getElementById('loadTextValQ2').innerHTML = (lcData[3]).toFixed(1)+'lb';
				break;
			case 99:
				lcData[4] = lcValue - tareData[4];
				if(lcData[4] < 0) lcData[4] = 0;
				document.getElementById('loadBarValQ3').style.width = (lcData[4]/maxCellLoad)*100+'%';
				document.getElementById('loadTextValQ3').innerHTML = (lcData[4]).toFixed(1)+'lb';
				break;
		}
		} 
		if(myLoadCellCounter == 3) {
			updateTotalWeight();
			updateDistros();
			myLoadCellCounter = 0;
		}
	} else {
		console.log(data);
	}
}

var totWeight;
function updateTotalWeight() {
	totWeight = lcData[1] + lcData[2] + lcData[3] + lcData[4];
	document.getElementById('weightBarVal').style.width = (totWeight/700)*100+'%';
	document.getElementById('weightTextval').innerHTML = (totWeight).toFixed(1)+'lb';
}

function updateDistros() {
	if(totWeight > 25) {
		var frontToBackDist = (lcData[1] + lcData[2]) / totWeight;
		var backToFrontDist = (lcData[3] + lcData[4]) / totWeight;
		avgFBDist = 1-((frontToBackDist + (1-backToFrontDist)) / 2);
		console.log('FB Dist: '+avgFBDist);
		document.getElementById('distroBarValFB').display = '';
		document.getElementById('distroBarValFB').style.left = (avgFBDist*0.88)*100+'%';
		document.getElementById('distroTextValFB').innerHTML = ((1-avgFBDist)*100).toFixed(0)+':'+((avgFBDist)*100).toFixed(0);
		document.getElementById('distroBarValFB').style.background = 'rgba('+(Math.round(Math.abs(avgFBDist-optimumFB)*255*12))+','+(Math.round((.8-(Math.abs(avgFBDist-optimumFB)))*255))+',150, 1)';

		var leftToRightDist = (lcData[2] + lcData[3]) / totWeight;
		var rightToLeftDist = (lcData[1] + lcData[4]) / totWeight;
		avgLRDist = 1-((leftToRightDist + (1-rightToLeftDist)) / 2);
		console.log('LR Dist: '+avgLRDist);
		document.getElementById('distroBarValLR').display = '';
		document.getElementById('distroBarValLR').style.left = ((1-avgLRDist)*.88)*100+'%';
		document.getElementById('distroTextValLR').innerHTML = ((avgLRDist)*100).toFixed(0)+':'+((1-avgLRDist)*100).toFixed(0);
		document.getElementById('distroBarValLR').style.background = 'rgba('+(Math.round(Math.abs(avgLRDist-optimumLR)*255*20))+','+(Math.round((.8-(Math.abs(avgLRDist-optimumLR)))*255))+',150, 1)';
	} else {
		document.getElementById('distroBarValFB').display = 'none';
		document.getElementById('distroBarValLR').display = 'none';
	}
}

window.addEventListener('load', initWeighToolPage, false);
window.addEventListener('unload', myCOMObject.closeWebSocket, false);
window.onbeforeunload = myCOMObject.closeWebSocket;








function ArduinoCommunicationObject() {
    //conversion = .0205/4;
    this.isDebugging = true;
    this.autoParsing = true;
    this.isConnected = false;

    //Web Socket Properties
    this.myIPAddress = '192.168.11.177';
    this.myPort = 80;
    this.ws;

    //Registered Callbacks
    this.cb_OnOpened = undefined;
    this.cb_OnClosed = undefined;
    this.cb_OnError = undefined;
    this.cb_OnMessage = undefined;
    this.cb_OnParsedArduinoData = undefined;
    
    //Register a callback for individual arduino pins
    this.registeredPinCallbacks = {};

    //Public methods
    this.setIPAddress = setMyIPAddress;
    this.setPort = setMyPort;
    this.requestManualParsing = requestManualParsing;
    this.initWebSocket = initWebSocket;
    this.registerPinCallback = registerPinCallback;
    this.unregisterPinCallback = unregisterPinCallback;
    this.closeWebSocket = closeWebSocket;
    this.changeComRate = changeComRate;
    this.startListeningToPin = startListeningToPin;
    this.stopListeningToPin = stopListeningToPin;
    this.sendValueToPin = sendValueToPin;
    this.startPollingLoadCells = startPollingLoadCells;
    this.stopPollingLoadCells = stopPollingLoadCells;

    //Don't call this method
    this.handleWebSocketMessage = handleWebSocketMessage;
    this.debug = debug;
    this.socketSend = socketSend;

    function debug(str) {
        // document.getElementById("debug").innerHTML = "<p>"+str+"<p>"+document.getElementById('debug').innerHTML;
        if(this.isDebugging) window.console.log('COM Object: ' + str);
    }

    function setMyIPAddress(ipAddressAsString) {
        // Must be in the form of 'XXX.XXX.XXX.XXX'  - not a full url
        this.myIPAddress = ipAddressAsString;
    }

    function setMyPort(port) {
        this.myPort = parseInt(port);
    }

    function requestManualParsing(val) {
        if(val) {
            if(this.cb_OnMessage != undefined) {
                this.autoParsing = false;
            } else {
                this.debug('ERROR -> cb_OnMessage is undefined! To manually parse data you must register a callback method with "cb_OnMessage"');
            }
        } else {
            this.autoParsing = true;
        }
    }

    function registerPinCallback(pinNumber, callback) {
        this.registeredPinCallbacks[pinNumber] = callback;
    }

    function unregisterPinCallback(pinNumber) {
        this.registeredPinCallbacks[pinNumber] = false;
    }

    function changeComRate(rateInMilliSeconds) {
        var rate = parseInt(rateInMilliSeconds);
        if(rate > 2000) rate = 2000 && this.debug('Max COM Rate is 2000ms, Setting COM Rate to 2000ms');
        else if(rate < 50) rate = 50 && this.debug('Minimum COM Rate is 50ms, Setting COM Rate to 50ms');
        this.socketSend('C'+rate+'&');
        this.debug('Updating com int to: '+wsDelay+"ms");
        document.getElementById('rangeTitle').innerHTML = 'COM Interval: '+wsDelay+'ms';
    }

    function startPollingLoadCells() {
        this.socketSend("L11&");
    }

    function stopPollingLoadCells() {
        this.socketSend("L01&");
    }

    function startListeningToPin(type, pin) {
        pin = parseInt(pin);
        if(pin > 0 && pin < 100) {
            if(parseInt(type) == 1) this.socketSend("110"+parseInt(pin)+"0&");
            else if(parseInt(type) == 0) this.socketSend("100"+parseInt(pin)+"0&");
            else this.debug("Error -> Invalid 'type' value (Valid 'type' values: 0 for digital or 1 for analog)");
        } else {
            this.debug("Error -> Invalid 'pin'! (Valid pins are 1 - 99,  *assuming the arduino has those pins*"); 
        }
    }

    function stopListeningToPin(type, pin){
        pin = parseInt(pin);
        if(pin > 0 && pin < 100) {
            if(parseInt(type) == 1) this.socketSend("010"+parseInt(pin)+"0&");
            else if(parseInt(type) == 0) this.socketSend("000"+parseInt(pin)+"0&");
            else this.debug("Error -> Invalid 'type' value (Valid 'type' values: 0 for digital or 1 for analog)");
        } else {
            this.debug("Error -> Invalid 'pin'! (Valid pins are 1 - 99,  *assuming the arduino has those pins*"); 
        }
    }

    function sendValueToPin(pin, value) {
        // You may only send values to digital pins!
        pin = parseInt(pin);
        if(pin > 0 && pin < 100) {  //Valid pinValue
            if(pin < 10) pin = '0'+pin; // Make it two digits
            if(value >= 0 && value <= 255) {
                this.socketSend("001"+pin+""+value+"&");
                return 1;
            } else {
                this.debug("Error -> Invalid 'value'! (Valid values are 0-255");
            }
        } else {
            this.debug("Error -> Invalid 'pin'! (Valid pins are 1 - 99,  *assuming the arduino has those pins*"); 
        }
    }

    function getValueFromPin(type, pin) {
        pin = parseInt(pin);
        if(pin > 0 && pin < 100) {
            if(parseInt(type) == 1) this.socketSend("010"+parseInt(pin)+"0&");
            else if(parseInt(type) == 0) this.socketSend("000"+parseInt(pin)+"0&");
            else this.debug("Error -> Invalid 'type' value (Valid 'type' values: 0 for digital or 1 for analog)");
        } else {
            this.debug("Error -> Invalid 'pin'! (Valid pins are 1 - 99,  *assuming the arduino has those pins*"); 
        }
    }

    function initWebSocket() {
        try {
            var ctx = this;
            var finalAddress = 'ws://'+this.myIPAddress+':'+this.myPort+'/';
            this.debug("Setting up socket with address -> "+finalAddress);
            this.ws = new WebSocket(finalAddress);
            this.ws.onmessage = function(evt) {
                ctx.isConnected = true;
                ctx.debug(evt.data);
                if(ctx.cb_OnMessage) ctx.cb_OnMessage(evt.data);
                if(ctx.autoParsing) ctx.handleWebSocketMessage(evt.data);
            };
            this.ws.onerror = function(evt) {
                ctx.debug(evt.data);
                if(ctx.cb_OnError) ctx.cb_OnError(evt.data);
            };
            this.ws.onopen = function() {
                ctx.debug("attempting connection");
                ctx.socketSend("Hello, Ardunio");
                if(ctx.cb_OnOpened) ctx.cb_OnOpened();
            };
            this.ws.onclose = function() {
                ctx.debug('closing socket');
                ctx.ws.close();
                ctx.isConnected = false;
                if(ctx.cb_OnClosed) ctx.cb_OnClosed();
            };
        } catch(exception) {
            window.console.log('COM Object: Fatal Error -> '+exception);
            this.isConnected = false;
        }
    }

    function socketSend(cmdToSend) {
        if(this.ws) this.ws.send(cmdToSend);
        else this.debug('Error -> web socket undefined');
    }

    function handleWebSocketMessage(msg) {
        var type, pin, value;
        var msgIndx = 0;
        var msgLength = 0;
        if(msg != "im here") {
        this.debug(msg.length);
        for(j=0; j < msg.length-1; j++) {
            if(msg.charAt(j) == '&') {
                if(msgLength >= 4) {
                    for(i=msgIndx; i < msgIndx+msgLength; i++) {
                        switch(i-msgIndx) {
                            case 0:
                                if(msg.charAt(i) == 0) {
                                    type = 'Digital';
                                } else if(msg.charAt(i) == 1) {
                                    type = 'Analog';
                                }
                                break;
                            case 1:
                                pin = msg.charAt(i);
                                break;
                            case 2: 
                                pin += msg.charAt(i);
                                break;
                            case 3:
                                value = msg.charAt(i);
                                break;
                            default:
                                value += msg.charAt(i); 
                        }
                        
                    }
                    pin = parseInt(pin);
                    value = parseInt(value);
                
                    this.debug('Type '+type+' Pin:'+pin+' @ '+value);
                    if(this.cb_OnParsedArduinoData) this.cb_OnParsedArduinoData({'type':type, 'pin':pin, 'value':value});

                    // var cbKey = (type == 'Analog' ? 'A'+pin : pin); 
                    if(this.registeredPinCallbacks[pin]) {
                        this.registeredPinCallbacks[pin]({'type':type, 'pin':pin, 'value':value});
                    }
                }
                msgLength = 0;
                msgIndx = j+1;
            } else {
                msgLength++;
            }

        }
        msgLength = 0;
        msgIndx = 0;
        }
    } 

    function closeWebSocket() {
        if(this.ws) {
            this.ws.onclose();
        } else {
            this.debug('Error -> No web socket to close');
        }
    }

    window.addEventListener('unload', this.closeWebSocket, false);
}










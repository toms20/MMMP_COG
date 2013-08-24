/****************************************/
/***   ARDUINO COMMUNICATION OBJECT   ***/
/*
    Abstract:
    This object is used to set up and 
    maintain a websocket between the 
    clients browser and the arduino.

    Description:
    It provides convienence methods for
        - creating a websocket
        - closing the websocket
        - parsing recieved data from the
        arduino
        - encoding data to be sent to the
        arduino 
        - changing arduino/browser
        communication rate
        - registering callback methods 
        for individual pin listening.
*/
/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/

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
}


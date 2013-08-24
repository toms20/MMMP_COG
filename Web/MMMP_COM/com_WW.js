var debug = true;
var isConnected = false;
// doFunc(testPost, {hello, whats up});

self.onmessage = function handleMessage(event) {
    switch(event.data) {
        case 'init ws':
            if(!isConnected) initWebSocket();
            break;
        case 'kill ws':
            if(ws) ws.close();
            else if(debug) post('No web socket to close');
            break;
        case 'die':
            if(ws) ws.close();
            self.close();
            break;
    }
}

function initWebSocket() {
    try {
        if(debug) post("Setting up socket");
        if(typeof(WebSocket) !== 'undefined') {
            ws = new WebSocket("ws://192.168.11.177:80/");
            ws.onmessage = function(evt) {
                if(debug) post(evt.data);
                handleWebSocketMessage(evt.data);
            };
            ws.onerror = function(evt) {
                if(debug) post(evt.data);
            };
            ws.onclose = function() {
                if(debug) post("wsClosed");
                isConnected = false;
            };
            ws.onopen = function() {
                if(debug) post("wsOpened");
                socketSend("Hello, Ardunio");
                isConnected = true;
            };
        } else {
            //probs firefox...
            post('unsupported');
            return 0;
        }
    } catch(exception) {
        if(debug) post('<p>Error'+exception);
    }
}

function socketSend(msg) {
    ws.send(msg);
}

function handleWebSocketMessage(msg) {
    var type, pin, value;
    var msgIndx = 0;
    var msgLength = 0;
    if(msg != "im here") {
    // console.log(msg.length);
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
                if(pin == 94) {
                    // console.log('ping data goes here');
                }
                if(pin >= 96) {
                    handleLoadCellData(pin, value);
                }
                // if(msgArray.length > 50) {
                //     msgArray.shift();
                // }
                // msgArray.push("<p>"+type+' Pin:'+pin+' @ '+value+"<p>");
                // document.getElementById('msg').innerHTML = msgArray;
                if(debug) post("<p>"+type+' Pin:'+pin+' @ '+value+"<p>");
                if(pin == 14 && type == 'Analog' && value > 0) {
                     if(irLeft.length > 5) {
                        irLeft.shift();
                     }
                     irLeft.push(value);
                     for(i = 0; i < irLeft.length; i++) {
                        if(i == 0) {
                            value = irLeft[i];
                        }else {
                            value = value + irLeft[i];
                        }
                     }
                     value = value/irLeft.length;
                     tiltRadial.setProgress(value);
                     tiltRadial.redraw(); 
                }
                if(pin == 13 && type == 'Analog' && value > 0) {
                     value = parseInt(value);
                     if(irRight.length > 5) {
                        irRight.shift();
                     }
                     irRight.push(value);
                     for(i = 0; i < irRight.length; i++) {
                        if(i == 0) {
                            value = irRight[i];
                        }else {
                            value = value + irRight[i];
                        }
                     }
                     value = value/irRight.length;
                     tiltRadialRight.setProgress(value);
                     tiltRadialRight.redraw(); 
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

function post(msg) {
    self.postMessage([0, msg]);
}

// function doFunc(func, paramArray) {
//     self.postMessage([1, funcName, paramArray]);
// }

function handleLoadCellData(pin, val) {
    // console.log('in handleLoadCellData with pin:' + pin +' and val:' + val);
    // if(pin == 96) {
    //         if(lcQ3.length>=loadCellHistoryLength) {
    //             lcQ3.shift();
    //         }
    //         lcQ3.push(val);
    //         if(tare3 > 0) {
    //             radQ3v.setProgress(Math.abs(val - tare3)*conversion);
    //         } else {
    //             radQ3v.setProgress(val);
    //         }
    //         radQ3v.redraw(); 
    // }
    // if(pin == 97) {
    //         if(lcQ4.length>=loadCellHistoryLength) {
    //             lcQ4.shift();
    //         }
    //         lcQ4.push(val);
    //         // console.log('adjusting Q4 val:'+val+" tare: "+tare4);
    //         if(tare4 > 0) {
    //             radQ4v.setProgress(Math.abs(val - tare4)*conversion);
    //         } else {
    //             radQ4v.setProgress(val);
    //         }
    //         radQ4v.redraw();
    // }
    // if(pin == 98) {
    //         if(lcQ1.length>=loadCellHistoryLength) {
    //             lcQ1.shift();
    //         }
    //         lcQ1.push(val);
    //         if(tare1 > 0) {
    //             radQ1v.setProgress(Math.abs(val - tare1)*conversion);
    //         } else {
    //             radQ1v.setProgress(val);
    //         }
    //         radQ1v.redraw();
    // }
    // if(pin == 99) {
    //         if(lcQ2.length>=loadCellHistoryLength) {
    //             lcQ2.shift();
    //         }
    //         lcQ2.push(val);
    //         if(tare2 > 0) {
    //             radQ2v.setProgress(Math.abs(val - tare2)*conversion);
    //         } else {
    //             radQ2v.setProgress(val);
    //         }
    //         radQ2v.redraw();
    
    // }


}


function mapData(val, fmin, fmax, tmin, tmax) {
    // console.log('here');
    return (val - fmin) * (tmax - tmin) / (fmax - fmin) + tmin;
}





































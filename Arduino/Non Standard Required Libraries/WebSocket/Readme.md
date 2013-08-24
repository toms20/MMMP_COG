ARDUINO WebSocketServer Library 
============================= 

Abstract
--------
This library is a slightly modified version of ejeklint's [ArduinoWebsocketServer](https://github.com/ejeklint/ArduinoWebsocketServer). The changes made allow for the library to listen for and respond to HTTP GET requests. 


Description
------------
This library is used for 
* creating / maintaining / and closing a websocket
* sending / retrieving encoded data through said websocket
* listening for and responding to HTTP GET requests


Usage Examples
---------------
<dl>
<dt>Minimal Sketch</dt>
</dl>
        
        #include <SPI.h>
        #include <Ethernet.h>
        #include <WebSocket.h>

        byte mac[] = { 0x99, 0x99, 0x99, 0x99, 0x99, 0x99 }; //Replace with the mac address on the ethernet sheild
        byte ip[] = { 192, 168, 1 , 177 }; //or similar

        // Create a Websocket server
        WebSocket wsServer;

        //Implement callback methods
        void onConnect(WebSocket &socket) {
          Serial.println("onConnect called");
        }

        void onData(WebSocket &socket, char* dataString, byte frameLength) {
          
          Serial.print("Got data: ");
          Serial.write((unsigned char*)dataString, frameLength);
          Serial.println();
          
          // Just echo back data for fun.
          socket.send(dataString, strlen(dataString));
        }

        void onDisconnect(WebSocket &socket) {
          Serial.println("onDisconnect called");
        }

        void onServeFileRequested(WebSocket &socket, EthernetClient client, char *file) { 
          //will be called when the shield encounters an HTTP GET request
          //'file' is the requested file and can be queried for on the SD card then sent to the client. 
        }
        //Done implementing callbacks

        void setup() {
          Ethernet.begin(mac, ip);
          wsServer.registerConnectCallback(&onConnect); 
          wsServer.registerDataCallback(&onData);
          wsServer.registerDisconnectCallback(&onDisconnect);  
          wsServer.registerServeFileCallback(&onServeFileRequested);
          wsServer.begin();
        }

        void loop() {
          // Should be called for each loop.
          wsServer.listen();
          
          // Do other stuff here, but don't hang or cause long delays.
          delay(100);
          if (wsServer.isConnected()) {
            wsServer.send("im here", 7);
          }
        }

See the current code [here](https://github.com/toms20/MMMP_COG/blob/master/Arduino/MMMP_CODEv2_2/MMMP_CODEv2_2.ino).
        
Again, this code is a slight modification of ejeklint's [ArduinoWebsocketServer](https://github.com/ejeklint/ArduinoWebsocketServer) work. All credit should be given to ejeklint where appropriate.

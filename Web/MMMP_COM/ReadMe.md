ARDUINO COMMUNICATION OBJECT 
============================= 

Abstract
--------
This object is used to set up and maintain a websocket between the clients browser and the arduino.

** NOTE ** 
For this object to work properly, the Arduino must implement this [custom WebSocket Library](https://github.com/toms20/MMMP_COG/tree/master/Arduino/Non%20Standard%20Required%20Libraries/WebSocket).

Description
------------
This object provides convienence methods for
* creating a websocket
* closing the websocket
* parsing recieved data from the arduino
* encoding data to be sent to the arduino 
* changing arduino/browser communication rate
* registering callback methods for individual pin listening.


Usage Examples
---------------
<dl>
<dt>Methods</dt>
<dd>
Create and new instance of the object
    
        
            myCOMObject = new ArduinoCommunicationObject();
        

Set the IP Address to point to the Arduino
    
        
        myCOMObject.setIPAddress('192.168.1.1');
        

Set the communication port
    
        
        myCOMObject.setPort(80);
        
Initiate Web Socket (connection)
    
        
        myCOMObject.initWebSocket();
        

Register/unregister for pin callbacks
    
        
        myCOMObject.registerPinCallback(pin, function);
        myCOMObject.unregisterPinCallback(pin);
        //Where:
        //pin = (int) any pin on the arduino
        //function = any function in your .js code
        

Destroy Web Socket (connection)
    
        
        myCOMObject.closeWebSocket();
        
</dd>
<dl>Arduino Pin Interaction Methods</dl>
<dd>
Starts continuous polling of an Arduino's pin
    
        
        myCOMObject.startListeningToPin(type, pin);
        

Stops the given pin from being polled
    
        
        myCOMObject.stopListeningToPin(type, pin);
        

Sends, and sets, an Arduino's digital pin to a given value
    
        
        myCOMObject.sendValueToPin(pin, value);
        //Where:
        //value = 0 | 1 for non PWM pins or 0 - 255 for PWM capable pins
        //type = 0 for digital pin | 1 for analog pin
        
</dd>
<dt>Properties</dt>
<dd>
Check connection status
    
        
        (boolean) myCOMObject.isConnected
        

Set debugging logs ON/OFF
    
        
        (boolean) myCOMObject.isDebugging
        
</dd>
<dt>Available Callbacks</dt>
<dd>
        
        myCOMObject.cb_OnOpened = yourFunction
        myCOMObject.cb_OnClosed = yourFunction
        myCOMObject.cb_OnError = yourFunction
        myCOMObject.cb_OnMessage = yourFunction
        myCOMObject.cb_OnParsedArduinoData = yourFunction
        
</dd>
<dt>Advanced Methods</dt>
<dd>
Parse the incomming Arduino data manually
    
        
        myCOMObject.requestManualParsing()
        //NOTE - In order to receive the raw data you must register cb_OnMessage with a callback.
        

Change the COM rate 
    
        
        myCOMObject.changeComRate(rateInMilliseconds);
        //Valid rates 50ms - 2000ms, values outside this range will be trimmed to these values
        
</dd>
</dl>

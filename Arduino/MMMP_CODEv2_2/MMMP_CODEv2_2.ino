/******************************************************************/
/*                    CREATED June 4th 2013
LOG:
- Added support for lcd screen
- Added support for push button controls

TODO:
- Offload all these functions into a Scale Class
- Implement a health meter... 

*/
/******************************************************************/

#include <SPI.h>
#include <Ethernet.h>
#include <Wire.h>
#include <SD.h>
#include <Adafruit_ADS1015.h>
#include <WebSocket.h>
#include <SoftwareSerial.h>
#include <sLCD.h>


double loadCellToPoundsConversionConstant = (0.023/2);
double loadCellToPoundsConversionSlope = 0;

Adafruit_ADS1115 ads1115(0x48);

// Enabe debug tracing to Serial port.
#define DEBUG

// Here we define a maximum framelength to 64 bytes. Default is 256.
#define MAX_FRAME_LENGTH 64

//Define our pins being used
#define PIN_W5100 10  //Ethernet Sheild
#define PIN_SD 4     //Ethernet Sheild
#define PIN_SPI1 50   //Ethernet Sheild
#define PIN_SPI2 51   //Ethernet Sheild
#define PIN_SPI3 52   //Ethernet Sheild
#define PIN_HWSS 53   //Ethernet Sheild
#define PIN_ACT_RELAY 6   //Relay Mosfet (Actuator Polarity)
#define PIN_ACT_POWER 5   //Actuator Mosfet
#define PIN_LCD 7     //LCD Display
#define PIN_LED_HEALTH_R 44
#define PIN_LED_HEALTH_G 45
#define PIN_LED_HEALTH_B 46
#define PIN_LED_STATUS_R 11
#define PIN_LED_STATUS_G 12
#define PIN_LED_STATUS_B 13
#define PIN_SDA 20          //Load Cell DAC
#define PIN_SCL 21          //Load Cell DAC
#define PIN_ACCEL_LEFT A0   //Analog
#define PIN_ACCEL_RIGHT A1  //Analog
#define PIN_TILT_POT A3     //Analog

//Use Interupts for hardware button presses
//Board	        int.0	int.1	int.2	int.3   int.4   int.5
//Mega2560	2	3	-21-	-20-	19	18
#define PIN_HW_TARE 19
#define PIN_HW_DISP 18
#define INT_HW_TARE 4
#define INT_HW_DISP 5

// No need for interupts for limit switches as the stay depressed
// (so we will just poll their value while tilting)
#define PIN_LIMITSWITCH_SET_A 22
#define PIN_LIMITSWITCH_SET_B 23

unsigned long timeDatum;

const byte relayCoilPin = PIN_ACT_RELAY;
boolean relayCoilFlag = 0;
const byte motorPowerPin = PIN_ACT_POWER;
boolean motorPowerFlag = 0;

//MISC Variables
String temp = "";
int cmdLength = 0;
int cmdStart = -1;
int cmdValue = -1;
int cmdPin = -1;
int cmdType = -1;
int cmdPers = -1;
String cmdBuilder = "";
int adcPreGain = 1; //Default Value

//Define persistant booleans
boolean pollingADC = false;
boolean isScaleTilting = 0;
boolean isSetToExtending = 0;
boolean check = 0;
#define digiSize 54
#define analSize 16
int digiPers[digiSize];
int analPers[analSize];
#define digiPinBlackListSize 19
#define analPinBlackListSize 3
int digiPinBlackList[digiPinBlackListSize] = {PIN_SD, PIN_W5100, PIN_SPI1, PIN_SPI2, PIN_SPI3, PIN_HWSS, PIN_LCD, PIN_LED_HEALTH_R, PIN_LED_HEALTH_G, PIN_LED_HEALTH_B, PIN_LED_STATUS_R, PIN_LED_STATUS_G, PIN_LED_STATUS_B, PIN_SDA, PIN_SCL, PIN_HW_TARE, PIN_HW_DISP, PIN_LIMITSWITCH_SET_A, PIN_LIMITSWITCH_SET_B};

//Basically the accelerometers
int analPinBlackList[analPinBlackListSize] = {PIN_ACCEL_LEFT, PIN_ACCEL_RIGHT, PIN_TILT_POT};

// Might repurpose this for the accels...
#define irLeftSize 10
int irLeft[irLeftSize];
#define irSlopeHistorySize 7
int irSlopeHistory[irSlopeHistorySize] = {0,0,0,0,0,0,0};

//Define MAC and IP for Ethernet Shield 
byte mac[] = { 0x90, 0xA2, 0xDA, 0x0E, 0x93, 0xCA };
byte ip[] = { 192, 168, 11 , 177 };
//EthernetServer server(80);
// Create a Websocket server
WebSocket wsServer;
#define INDEX "spl.txt"
//Ethernet Flags
boolean isAvailableForWebSocket = true;
//Main COM interval
int wsDelay = 500;


//HARDWARE VARIABLES
volatile int btnDisplayFlag = LOW;
volatile int btnTareFlag = LOW;
sLCD lcd(PIN_LCD);
unsigned long displayTimeout = 0;
const long timeoutThreshold = 60000;
boolean isDisplayLogging = true;

int16_t lc4LastValue = 0;
int16_t lc1LastValue = 0;
int16_t lc2LastValue = 0;
int16_t lc3LastValue = 0;

int16_t lc4TareValue = 0;
int16_t lc1TareValue = 0;
int16_t lc2TareValue = 0;
int16_t lc3TareValue = 0;

int pollADCLocally = 0;

void setup() {
  //Initiate Serial Debugging
#ifdef DEBUG  
  Serial.begin(115200);
  Serial.println("Initializing");
#endif

  lcd.setScreenSize();
  lcd.clear();
  lcd.turnDisplayOn();
  lcd.setBrightness(30);
  attachInterrupt(INT_HW_DISP, handleDisplayButtonPressed, FALLING);
  attachInterrupt(INT_HW_TARE, handleTareButtonPressed, FALLING);
  displayTimeout = millis();

  //Initiate Ethernet Shield
  Ethernet.begin(mac, ip);
  wsServer.registerConnectCallback(&onConnect);
  wsServer.registerDataCallback(&onData);
  wsServer.registerDisconnectCallback(&onDisconnect);  
  wsServer.registerServeFileCallback(&onServeFileRequested);
  wsServer.begin();
  delay(100); // Give Ethernet time to get ready
//  isListeningForClients = true;
  isAvailableForWebSocket = true;
  if(isDisplayLogging) lcd.display("Ethernet Ready");
  
  //Initiate ADS1115 ADC 
  ads1115.begin();
  delay(100);
  if(isDisplayLogging) lcd.display("ADC Ready");
  
  //Initiate Persistant Command Arrays
  for(int i=0; i<digiSize; i++) {
    digiPers[i] = 0;
  }
  for(int i=0; i<analSize; i++) {
    analPers[i] = 0;
  }
  
  pinMode(53, OUTPUT);
  #ifdef DEBUG
  Serial.println("Booting up SD Card...");
  #endif
  if (!SD.begin(4)) {
     #ifdef DEBUG
     Serial.println("initialization failed!");
     #endif
     if(isDisplayLogging) lcd.display("Database Failed!");
   } else {
     #ifdef DEBUG
     Serial.println("SD Ready!");
     #endif
     if(isDisplayLogging) lcd.display("Database Ready");
   }
   delay(100);
   if(isDisplayLogging) lcd.display("Boot Complete!");
}

void loop() {
      // Listen for incoming transmissions
      wsServer.listen();
      if (wsServer.isConnected()) {
          handleWebSocketConnection();
      } else {
         //Socket Stanby Mode
         #ifdef DEBUG
         Serial.print(".");
         #endif
//         if(isDisplayLogging) lcd.display(".");
         delay(1000);
         checkDisplayTimeout();
         if(pollADCLocally) {
           pollADC(0);
         }
      } 
      checkForHardwareButtonPressed();
}

/*********************/
// HARDWARE FUNCTIONS
/*********************/
void checkForHardwareButtonPressed() {
   //Two buttons (display(wake/sleep) and tare)
   if(btnDisplayFlag) {
     if(lcd.isScreenOn()) {
       //Turn off display
      lcd.turnDisplayOff();
      lcd.setBrightness(1);
      pollADCLocally = 0;
     } else {
       //Turn on display
       lcd.turnDisplayOn();
       lcd.setBrightness(30);
       displayTimeout = millis();
       pollADCLocally = 1;
     }
     btnDisplayFlag = LOW;
   }
   if(btnTareFlag) {
    if(!lcd.isScreenOn()) {
      lcd.turnDisplayOn();
      lcd.setBrightness(30);
    }
    //Start polling LoadCells
    //Tare load cells
    pollADCLocally = 1;
    displayTimeout = millis();
    if(lc4TareValue == 0 && lc3TareValue == 0 && lc2TareValue == 0 && lc1TareValue == 0) {
      Serial.println("TARRING LOAD CELLS");
      lc4TareValue = lc4LastValue;
      lc3TareValue = lc3LastValue;
      lc2TareValue = lc2LastValue;
      lc1TareValue = lc1LastValue;
    } else {
      Serial.println("UNTARRING LOAD CELLS");
      lc4TareValue = 0;
      lc3TareValue = 0;
      lc2TareValue = 0;
      lc1TareValue = 0;
    }
    btnTareFlag = LOW;
   }
   
}

void checkDisplayTimeout() {
    if(millis() - displayTimeout > timeoutThreshold) {
      lcd.setBrightness(1);
      lcd.turnDisplayOff();
      isDisplayLogging = false;
      pollADCLocally = 0;
    }
}

void handleDisplayButtonPressed() {
  btnDisplayFlag = HIGH;
}

void handleTareButtonPressed() {
  btnTareFlag = HIGH;
}
/*^^^^^^^^^^^^^^^^^^^*/

/*********************/
// WEB SOCKET FUNCTIONS
/*********************/
void onConnect(WebSocket &socket) {
  #ifdef DEBUG
  Serial.println("WebSocket Initiated");
  #endif
}

void onServeFileRequested(WebSocket &socket, EthernetClient client, char *file) {
//  if(!lcd.isScreenOn()) {
//    lcd.turnDisplayOn();
//    isDisplayLogging = true;
//    lcd.display("Connecting...");
//    displayTimeout = millis();
//  } 
  Serial.println("ServeFileResquest was called");
  Serial.println(file);
  if(strstr(file, "GET / HTTP/")) {
    Serial.println("********************");
    Serial.println("**  Sending INDEX **");
    Serial.println("********************");
    sendStandardResponseHeader(client);
     if(sendFileFromSD(client, INDEX) == -1) {
       //try to reinstantiate sd card
       pinMode(53, OUTPUT);
      #ifdef DEBUG
      Serial.println("Booting up SD Card...");
      #endif
      if (!SD.begin(4)) {
         #ifdef DEBUG
         Serial.println("initialization failed!");
         #endif
//         if(isDisplayLogging) {
//           lcd.display("Database Error!");
//           lcd.display("Please Remove SD");
//           lcd.display("Card, clean and");
//           lcd.display("reinsert it...");
//         }
       } else {
         #ifdef DEBUG
         Serial.println("SD Ready!");
         #endif
         sendFileFromSD(client, INDEX);
       }
     }
     delay(1);
     client.stop();
   } else {
       //Parse GET Header and send requested file if available...
       String rFile = (String)file;
       rFile = rFile.substring(rFile.indexOf("GET /")+5, rFile.indexOf(" HTTP/"));
       String ext = rFile.substring(rFile.indexOf("."), rFile.length());
       rFile.replace(ext, ".txt");
       Serial.print("Parsed File:"); Serial.print(rFile); Serial.print(" Old extension:");Serial.println(ext); 
       if(ext.indexOf(".js") >= 0) {
         sendStandardScriptResponseHeader(client);
       }else if(ext.indexOf(".css") >= 0) {
         sendStandardStyleResponseHeader(client);
       } else if(ext.indexOf(".html") >= 0) {
         sendStandardResponseHeader(client);
       } else {
         //unsupported file format (like .png or something) disregard it
         client.stop();
         return;
       }
       char file[rFile.length()+1];
       rFile.toCharArray(file, rFile.length()+1);
       sendFileFromSD(client, file);
   }
}

void sendStandardResponseHeader(EthernetClient c) {
  Serial.println("sending standard response header...");
  c.println("HTTP/1.1 200 OK");
  c.println("Content-Type: text/html");
  c.println("Connnection: close");
}

void sendStandardStyleResponseHeader(EthernetClient c) {
  Serial.println("sending standard style response header...");
  c.println("HTTP/1.1 200 OK");
  c.println("Content-Type: text/css");
  c.println("Connnection: close");
}

void sendStandardScriptResponseHeader(EthernetClient c) {
  Serial.println("sending standard script response header...");
  c.println("HTTP/1.1 200 OK");
  c.println("Content-Type: text/javascript");
  c.println("Connnection: close");
}


int sendFileFromSD(EthernetClient c, char *path) {
   #ifdef DEBUG
   Serial.println("Sending requested file from server...");
   #endif
   File myFile; 
   
   if(!SD.exists(path)) {
     #ifdef DEBUG
     Serial.println("the requested file does not exists!");
     #endif
     return -1;
   } else {
    myFile = SD.open(path);
    if (myFile) {
    #ifdef DEBUG
    Serial.print(path); Serial.println(":");
    #endif
    c.print("Content-Length: "); c.println(myFile.size(), DEC);
    c.println();
    String fileContents = "";
    // read from the file until there's nothing else in it:
    while (myFile.available()) {
    	c.write(myFile.read()); 
    }
    // close the file:
    myFile.close();
    fileContents = "";
   return 1;
  } else {
    #ifdef DEBUG
    Serial.println("error retrieving file!");
    #endif
    return 0;
  }
  }
}

void handleWebSocketConnection() {
// Handle Commands and iterate through sensors here
      #ifdef DEBUG
      Serial.println("Checking for persistant commands");
      #endif
      for(int i=0; i<digiSize; i++) {
        if(digiPers[i] == 1) {
         cmdStringBuilder(0, i, digitalRead(i), 1);
        }
      }
      for(int i=0; i<analSize; i++) {
        if(analPers[i] == 1) {
          cmdStringBuilder(1, i, analogRead(i), 1);
        }
      }
      
      //Check to see if AdDC is set to polling
      if(pollingADC) {
        pollADC(1);
      }
      
      if(cmdBuilder.length() > 2) {
       
       //timeDatum = millis() - timeDatum;
       //cmdStringBuilder(1, 94, timeDatum, 1); 
       //Send string   
       sendCmdString();
       cmdBuilder = "";
      } else {
        check = false;
        wsServer.send("im here", 7);
      }
      delay(wsDelay);
}

void onData(WebSocket &socket, char* dataString, byte frameLength) {
  //Time at which data is recieved
  timeDatum = millis();
  
#ifdef DEBUG
  Serial.print("Got data: ");
  Serial.write((unsigned char*)dataString, frameLength);
  Serial.println();
#endif
  
  /******************************************/
  // CODE FORMAT:
  // (persitance)(digi/anal)(read/write)(pin)(pin)(value...);
  //       X          X          X          XX        XXX... &
  // Terminated with '&'
  /******************************************/ 
  
  /******************************************/
  //  SPECIAL CASES:
  //  COM Rate: C(XXXX)&    (where XXXX is value in milliseconds)
  //  ADC Polling: L(X)(XX)&  (0/1 stop/start polling) (pre gain amp: 0, 1, 2, 4, 8, 16)
  /******************************************/ 
  
  //Convert char array to string for manipulation
  for(int i=0; i<frameLength; i++) {
    if(dataString[i] == '&') {
      //Check for special case of wsIteration Change
      if(cmdLength >= 2) {
       if(dataString[cmdStart+1] == 'C') {
        temp = "";
        for(int j = cmdStart+2; j <= (cmdStart+cmdLength); j++) {
          temp += dataString[j];
        }
        #ifdef DEBUG
        Serial.println("Calling handleComRate");
        #endif
        handleComRate(temp.toInt());
      }else if(dataString[cmdStart+1] == 'L') {
        #ifdef DEBUG
        Serial.println("Calling handleADCPolling");
        #endif
        if(cmdLength >= 3) {
          temp = "";
          temp += dataString[cmdStart+2];
          int cmd = temp.toInt();
          temp = "";
           for(int j = cmdStart+3; j <= (cmdStart+cmdLength); j++) {
              temp += dataString[j];
           }
          handleADCPolling(cmd, temp.toInt());
          temp = "";
          cmd = 0;
        }
      }else {
       // New Command so process the old one then reset
      if(cmdLength >= 5) {
        for(int j = cmdStart+4; j <= (cmdStart+cmdLength); j++) {
          if(j-cmdStart == 4) {
            temp = "";
            temp += dataString[j];
          } else if(j-cmdStart == 5) {
            temp += dataString[j];
            cmdPin = temp.toInt();
            temp = "";
          } else {
            temp += dataString[j];
          } 
        }
        //End of for loop
        
        if(!pinIsBlackListed(cmdPin)) {
        #ifdef DEBUG  
        Serial.print("cmdValue:");
        Serial.println(temp);
        #endif
        cmdValue = temp.toInt();
        temp = "";
        if(dataString[cmdStart+2] == '0') {
          //Type = Digital
          cmdType = 0;
          if(cmdPin <= digiSize) {
            //Update the digital persistance array
            if(dataString[cmdStart+1] == '0') {
              digiPers[cmdPin] = 0;
            } else {
              digiPers[cmdPin] = 1;
            }
            
            //Perform Cammand and append to return string...
            if(dataString[cmdStart+3] == '0') {
              //Digital Read Requested...
              //Should we set the pin mode to input? or just assume the user knows????
              pinMode(cmdPin, INPUT);
              cmdStringBuilder(cmdType, cmdPin, digitalRead(cmdPin), 1); 
            } else {
              #ifdef DEBUG
               Serial.print("Digital Write Requested:");
               Serial.print(cmdValue);
               Serial.print(" on Pin: ");
               Serial.println(cmdPin);
               #endif
               
              if(cmdValue == 0 || cmdValue == 1) {
                 //Valid digital write value
                 pinMode(cmdPin, OUTPUT);
                 digitalWrite(cmdPin, cmdValue);
                // if(bitRead(PINA, 6) == cmdValue) {
                   cmdStringBuilder(cmdType, cmdPin, cmdValue, 1);
//                 } else {
//                   Serial.print("Checking digital write: ");
//                   Serial.println(bitRead(PINA, 6));
//                   cmdStringBuilder(cmdType, cmdPin, 0, cmdLength, 0);
//                 }
              }
            }
            if(cmdPin == 6 || cmdPin == 5) {
              #ifdef DEBUG
              Serial.print("Motor Control Pin Called ");Serial.println(cmdPin);
              #endif
              if(cmdPin == 6) {
                isSetToExtending = digitalRead(cmdPin);
                relayCoilFlag = isSetToExtending;
              } else if(cmdPin == 5) {
                 isScaleTilting = digitalRead(cmdPin);
                 motorPowerFlag = isScaleTilting;
              }
            }
            
          } else {
            //Fatal Error: Non-Valid CMD Pin
             cmdStringBuilder(cmdType, cmdPin, 0, 0);
             cmdType = -1;
             cmdValue = -1;
             cmdPin = -1;
          } 
        } else if (dataString[cmdStart+2] == '1') {
          //Type = Analog
          cmdType = 1;
          //Update the analog persitance array
         if(cmdPin <= analSize) {
              if(dataString[cmdStart+1] == '0') {
                analPers[cmdPin] = 0;
              } else {
                analPers[cmdPin] = 1;
              }
              
              //Perform command and appaend to return string...
              if(dataString[cmdStart+3] == '0') {
                 // Analog Read Request
                 cmdStringBuilder(cmdType, cmdPin, analogRead(cmdPin), 1);
              } else {
                 // Analog Write Request
                 #ifdef DEBUG
                 Serial.print("Analog Write Requested:");
                 Serial.print(cmdValue);
                 Serial.print(" on Pin: ");
                 Serial.println(cmdPin);
                 #endif
                 
                 if(cmdValue >= 0 && cmdValue <= 255) {
                   analogWrite(cmdPin, cmdValue);
                   if(analogRead(cmdPin) == cmdValue) {
                   cmdStringBuilder(cmdType, cmdPin, cmdValue, 1);
                   } else {
                   cmdStringBuilder(cmdType, cmdPin, 0, 0);
                   }
                 }
              }
          } else {
             //Fatal Error: Non-Valid CMD Pin
             cmdStringBuilder(cmdType, cmdPin, 0, 0);
             cmdType = -1;
             cmdValue = -1;
             cmdPin = -1;
          }
        }
      }
      }
       
      } 
      //Done performing this idividual command
 
      // Reset temp variables and continue to check 'dataStraing' for more commands...
      cmdLength = 0;
      cmdStart = i;
      cmdType = -1;
      cmdValue = -1;
      cmdPin = -1;
     } else {
       //Invalid Command Format
      
     }
       
    }else {
      // if i != ';' then just continue iteating through command string
      cmdLength++;
    }
  }
  cmdLength = 0;
  cmdStart = -1;
  
  //End of first for loop (DONE READING INCOMING COMMAND STRING)
}

void onDisconnect(WebSocket &socket) {
  #ifdef DEBUG
  Serial.println("WebSocket Closed");
  #endif
//  if(isScaleTilting && check == false) {
//      #ifdef DEBUG
//      Serial.print("Not connected to host and scale is tipping!");
//      #endif
//      isSetToExtending = 0;
//      digitalWrite(4, 0);
//      check = true;
//    } else if(getIRSenseValue(14, 0) < 500 && isScaleTilting == 0) {
//      #ifdef DEBUG
//      Serial.println("It appears the scale is tilted without a user connected");
//      #endif
//      isSetToExtending = 0;
//      digitalWrite(relayCoilPin, 0);
//      relayCoilFlag = 0;
//      digitalWrite(motorPowerPin, 1);
//      motorPowerFlag = 1;
//      check = true;
//      isScaleTilting = 1;
//      timeDatum = millis();
//    }
  //Clean up persistants??
}

void handleComRate(int val) {
      if(val > 0) {
        //Valid delay value
        //cmdStringBuilder(0, 0, val, 1);
        wsDelay = val;
      }
}

int pinIsBlackListed(int pin) {
    for(int k=0; k<digiPinBlackListSize; k++) {
      if(cmdPin == digiPinBlackList[k]) {
        #ifdef DEBUG
        Serial.println("cmdPin is on the digitalPin blacklisted!");
        #endif
       return 1;
      }
    }
    for(int k=0; k<analPinBlackListSize; k++) {
      if(cmdPin == analPinBlackList[k]) {
        #ifdef DEBUG
        Serial.println("cmdPin is on the analogPin blacklist!");
        #endif
        return 1;
      }
    }
    return 0;
}

/*^^^^^^^^^^^^^^^^^^*/


/*********************/
// COM STRING FUNCTIONS
/*********************/

void cmdStringBuilder(int type, int pin, int value, int wasSuccess) {
  #ifdef DEBUG
  Serial.println("In cmdStringBuilder");
  #endif
  // Check the length of cmdString
  // The larger '200' check is an arbitrary value to prevent length from returning a value of 65535

  if(wasSuccess) {
//    temp = "";
//    temp.concat(type);
//    temp.concat(pin);
//    temp.concat(value);
//    temp.concat('&');
    cmdBuilder.concat(type);
    cmdBuilder.concat(pin);
    cmdBuilder.concat(value);
    cmdBuilder.concat('&');
  } else {
    cmdBuilder.concat(type);
    cmdBuilder.concat(pin);
    cmdBuilder.concat("E");
    cmdBuilder.concat("&");
  }
}

void sendCmdString() {
    //Check for strings longer than 64 characters (if so, split them up into 63 char chunks and send them)
    //Add a time stamp for connection analysis
    #ifdef DEBUG
    Serial.print("Sending Command String with length:"); Serial.println(cmdBuilder.length());
    #endif
    char* buf = {"hello"};
    cmdBuilder.toCharArray(buf, cmdBuilder.length()+1);
    wsServer.send(buf, cmdBuilder.length()+1);
    #ifdef DEBUG
    Serial.print("wsServer Sent: ");
    Serial.println(cmdBuilder);
    #endif
    cmdBuilder = "";
}
/*^^^^^^^^^^^^^^^^^^*/


/*********************/
// LOAD CELL FUNCTIONS
/*********************/
void handleADCPolling(int cmd, int preGain) {
  #ifdef DEBUG
  Serial.print("In ADC Polling with values:"); Serial.print(cmd); Serial.print("-"); Serial.println(preGain);
  #endif
  if(cmd == 1) {
    pollingADC = true;
    if(preGain >= 0 && preGain <= 16) {
      if(preGain == 0  || preGain == 1 || preGain == 2 || preGain == 4 || preGain == 8 || preGain == 16) {
        //Valid preGain Value
        adcPreGain = preGain;
        #ifdef DEBUG
        Serial.print("Initiating ADC Polling with a pre gain amp of:");
        Serial.println(adcPreGain);
        #endif
      }
      else {
        preGain = 1;
      }
    } else {
      preGain = 1;
    }
  } else {
    pollingADC = false;
    #ifdef DEBUG
    Serial.println("Terminating ADC Polling");
    #endif
  }
  
  // If we get our hands on 4 4 port double throw relays then update then 
  // reroute load cell signals from scale to arduino
  
}

void pollADC(boolean isForWeb) {
  #ifdef DEBUG
  Serial.println("In pollADC");
  #endif
  if(adcPreGain <= 0 || adcPreGain >= 16) {
   //invalid preGain Value -> Reseting to defualt value: 1
   adcPreGain = 1;
  }else {
     if(adcPreGain % 2 != 0) {
      //invalid preGain Value -> Reseting to defualt value: 1
      adcPreGain = 1;
    }
  }
  
  int16_t adc0, adc1, adc2, adc3;
  adc0 = ads1115.readADC_SingleEnded(0, adcPreGain);
  delay(5);
  adc1 = ads1115.readADC_SingleEnded(1, adcPreGain);
  delay(5);
  adc2 = ads1115.readADC_SingleEnded(2, adcPreGain);
  delay(5);
  adc3 = ads1115.readADC_SingleEnded(3, adcPreGain);
  
//  int adc0i, adc1i, adc2i, adc3i;
//  
//  adc0i = adc0;
//  adc
   lc4LastValue = adc0;
   lc1LastValue = adc1;
   lc2LastValue = adc2;
   lc3LastValue = adc3;
   if(!lcd.isScreenOn()) {
     lcd.turnDisplayOn();
     lcd.setBrightness(30);
//     displayTimeout = millis();
   }
   lcd.loadCells((lc1LastValue-lc1TareValue)*loadCellToPoundsConversionConstant, 
                 (lc2LastValue-lc2TareValue)*loadCellToPoundsConversionConstant, 
                 (lc3LastValue-lc3TareValue)*loadCellToPoundsConversionConstant, 
                 (lc4LastValue-lc4TareValue)*loadCellToPoundsConversionConstant, 
                 true);
  
  if(isForWeb) {
    //Quad 1 = Pin 96, Quad 2 = Pin 97 Quad 3 = Pin 98, Quad 4 = Pin 99 
    cmdStringBuilder(1, 96, adc0, 1);
    cmdStringBuilder(1, 97, adc1, 1);
    cmdStringBuilder(1, 98, adc2, 1);
    cmdStringBuilder(1, 99, adc3, 1);
  }
}

void handleIRSlope(int irValue) {
  int ind = 0;
  for(int i = 0; i<irSlopeHistorySize; i++) {
    if(irSlopeHistory[i] == 0 && ind == 0) {
      irSlopeHistory[i] = irValue;
      ind = 1;
    }
  }
  if(ind == 0) {
    //Shift contents of arrray down one index
    for(int i = 0; i<irSlopeHistorySize; i++) {
      if(i != 0) {
        irSlopeHistory[i-1] = irSlopeHistory[i];
      }
    }
    //write over last value in array
    irSlopeHistory[irSlopeHistorySize-1] = irValue;
  }
  
}

int getIRSlope () {
  if(irSlopeHistory[irSlopeHistorySize-1]-irSlopeHistory[0] > 5 && relayCoilFlag) {
    return 1;
  } else if(irSlopeHistory[irSlopeHistorySize-1]-irSlopeHistory[0] > 5 && relayCoilFlag == 0){
    return 3;
  } else if(irSlopeHistory[irSlopeHistorySize-1]-irSlopeHistory[0] < -5 && relayCoilFlag) {
    return 2;
  } else if(irSlopeHistory[irSlopeHistorySize-1]-irSlopeHistory[0] < -5 && relayCoilFlag == 0) {
    return 4;
  }
  else if(abs(irSlopeHistory[irSlopeHistorySize-1]-irSlopeHistory[0]) < 5) {
  return 0;
  }
}


int getIRSenseValue(int pin, int mapped) {
  //mapped: 0=(raw data) 1=(mapped data)
  //Serial.println("in getIRSenseValue");
  
  if(mapped) {
      return exp((analogRead(pin)-615.23)/(-150));
  } else {
    return analogRead(pin);
  }
}






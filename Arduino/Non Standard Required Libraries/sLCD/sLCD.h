#ifndef sLCD_h
#define sLCD_h

#if ARDUINO >= 100
#include "Arduino.h"       // for delayMicroseconds,digitalPinToBitMask, etc
#else
#include "WProgram.h"      // for delayMicroseconds
#include "pins_arduino.h"  // for digitalPinToBitMask, etc
#endif
#include "SoftwareSerial.h"

#define lcdDelay 4

class sLCD : public SoftwareSerial {
public:
    sLCD (int pin);

    void clear();
    void clearLine(int line);
    void setScreenSize();
    void setBoxCursor(boolean state);
    void setUnderlineCursor(boolean state);
    void placeCursor(int row, int col);
    void setBrightness(int val);
    void moveCursorRightOne();
    void moveCursorLeftOne();
    void selectLine(int line);
    void turnDisplayOn();
    void turnDisplayOff();
    void toggleSplash();
    void setSplash();
    boolean isScreenOn();
    void setBaudRate(int bRate);
    void display(const char* str);
    void loadCells(int lc1, int lc2, int lc3, int lc4, boolean isLB);
    
    void scrollingMarquee(const char *string1,const char *string2);
    

private:
	void command(uint8_t);
	void specialCommand(uint8_t);

	uint8_t _numlines;
	uint8_t _numchars;
	uint8_t _rowoffset;
    
    boolean SCREENSTATE;
    const char* displayArray[3];
};

#endif
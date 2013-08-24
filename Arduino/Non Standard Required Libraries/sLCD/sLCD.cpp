#include "SoftwareSerial.h"
#include "sLCD.h"

//	PUBLIC FUNCTIONS

// Contstructor
// defaults to 20x4 display
sLCD::sLCD(int pin) : SoftwareSerial(0, 7) {
    pinMode(7, OUTPUT);
    begin(9600);
}

// Clears screen and returns cursor to home position
void sLCD::clear(){
    command(0x01);
}

void sLCD::clearLine(int line) {
    switch(line) {
        case 0:
            line = 0;
            break;
        case 1:
            line = 64;
            break;
        case 2:
            line = 20;
            break;
        case 3:
            line = 84;
            break;
        default:
            return;
    }
    line += 128;
    command(line);
    print("                    ");
}

void sLCD::setScreenSize() {
    //Set 20 characters wide
    specialCommand(3);
    //Set 4 lines tall
    specialCommand(5);
}

void sLCD::setBoxCursor(boolean state) {
    if(state) command(0x0D);
    else command(0x0C);
}

void sLCD::setUnderlineCursor(boolean state) {
    if(state) command(0x0E);
    else command(0x0C);
}

void sLCD::placeCursor(int row, int col) {
    switch(row) {
        case 0:
            col += 0;
            break;
        case 1:
            col += 64;
            break;
        case 2:
            col += 20;
            break;
        case 3:
            col += 84;
            break;
        default:
            return;
    }
    col += 128;
    command(col);
}

void sLCD::setBrightness(int val){
	if(val >= 1 && val <= 30){
        val += 127;
        specialCommand(val);
	}
}

void sLCD::scrollingMarquee(const char *string1,const char *string2) {
    //This function scroll text across the screen on both lines
    clear(); // it's always good to clear the screen before movonh onto a new print
    for(int j = 0; j < 17; j++) {
        selectLine(0);
        for(int i = 0; i < j;i++)
            moveCursorRightOne();
        print(string1);
        selectLine(1);
        for(int i = 0; i < j;i++)
            moveCursorRightOne();
        print(string2);
        delay(250); // you must have a delay, otherwise the screen will print and clear before you can see the text
        clear();
    }
}

void sLCD::selectLine(int line) {
    switch(line) {
        case 0:
            line = 0;
            break;
        case 1:
            line = 64;
            break;
        case 2:
            line = 20;
            break;
        case 3:
            line = 84;
            break;
        default:
            return;
    }
    line += 128;
    command(line);
}

void sLCD::moveCursorRightOne() {
    command(0x14);
}

void sLCD::moveCursorLeftOne() {
    command(0x10);
}

void sLCD::toggleSplash() {
    specialCommand(0x09);
}

void sLCD::setSplash() {
    specialCommand(0x0A);
}

void sLCD::turnDisplayOff() {
    SCREENSTATE = false;
    command(0x08);
}

void sLCD::turnDisplayOn() {
    SCREENSTATE = true;
    command(0x0C);
}

void sLCD::setBaudRate(int bRate) {
    //I'm not gonna fuck with this...
    switch(bRate) {
        case 2400:
            //<control>k
            specialCommand(0x0B);
            break;
        case 4800:
            //<control>l
            specialCommand(0x0C);
            break;
        case 9600:
            //<control>m
            specialCommand(0x0D);
            break;
        case 14400:
            //<control>n
            specialCommand(0x0E);
            break;
        case 19200:
            //<control>o
            specialCommand(0x0F);
            break;
        case 38400:
            //<control>p
            specialCommand(0x10);
            break;
        default:
            //defualt to LCD default baud rate of 9600
            specialCommand(0x0D);
    }
}

boolean sLCD::isScreenOn() {
    return SCREENSTATE;
}

void sLCD::display(const char* str) {
    clear();
    
    displayArray[0] = displayArray[1];
    displayArray[1] = displayArray[2];
    displayArray[2] = displayArray[3];
    displayArray[3] = str;

    selectLine(0);
    print(displayArray[0]);
    selectLine(1);
    print(displayArray[1]);
    selectLine(2);
    print(displayArray[2]);
    selectLine(3);
    print(displayArray[3]);
}

void sLCD::loadCells(int lc1, int lc2, int lc3, int lc4, boolean isLB) {
    int totalLoad = lc1+lc2+lc3+lc4;
    int tempF = (((lc1+lc4)*100/totalLoad)+(100-(lc2+lc3)*100/totalLoad))/2;
    int tempL = (((lc3+lc4)*100/totalLoad)+(100-(lc1+lc2)*100/totalLoad))/2;

    clear();
    
    selectLine(0);
    print("Weight: ");
    print(totalLoad);
    if(isLB) print("lb");
    else print("kg");
    
    selectLine(1);
    print("Q4: ");
    print(lc4);
    placeCursor(1, 10);
    print("Q1: ");
    print(lc1);
    
    selectLine(2);
    print("Q3: ");
    print(lc3);
    placeCursor(2, 10);
    print("Q2: ");
    print(lc2);
    
    selectLine(3);
    print("FB ");
    print(tempF);
    print(":");
    print(100-tempF);
    
    placeCursor(3, 10);
    print("LR ");
    print(tempL);
    print(":");
    print(100-tempL);
}


// PRIVATE FUNCTIONS
// Functions for sending the special command values
void sLCD::command(uint8_t value){
	write(0xFE);
	write(value);
	delay(lcdDelay);
}
void sLCD::specialCommand(uint8_t value){
	write(0x7C);
	write(value);
	delay(lcdDelay);
}
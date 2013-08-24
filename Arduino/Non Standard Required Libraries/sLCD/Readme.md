Modified [serLCD](https://www.sparkfun.com/products/258) Library 
============================= 

Abstract
--------
An Arduino Library that is heavily based on serLCD firmware from sparkfun that implements a few convenience methods for use with the scale.

Description
------------
This library provides convienence methods for
* Drawing weight, load cell and distribution values to the lcd screen

Usage Examples
---------------
<dl>
<dt>Methods</dt>
</dl>
Create a new instance of the object

        sLCD lcd(PIN_LCD);

Main drawing method
    
        
        lcd.loadCells(int lc1, int lc2, int lc3, int lc4, boolean isLB);
        //Where lc1, lc2, lc3, lc4 are the loadcell values to be displayed
        // the numbering follows the standard quadrant numbering system
        // starting at noon (12 o'clock) and moving clockwise 1 -> 2 -> 3 -> 4
         
        // isLB is a boolean indicating pounds or kilograms units
        // this is simply for drawing purposes, no conversions are performed
        

Clear the Screen    
        

        lcd.clear()
        

Turn Display On / Off
    
        
        lcd.turnDisplayOn();
        lcd.turnDisplayOff();
        

Set Display Brightness
    
        
        lcd.setBrightness(int brightness);
        // Where brightness ranges from 0 -> 30
        // 0 = no backlight
        // 30 = max backlight


Check Display Status (On / Off)
    
        
        lcd.isScreenOn()


Check the header file for a full list of available methods
        



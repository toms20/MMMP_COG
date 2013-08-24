var isMetric = false;
var lb_to_kg = 0.453592;
var lcData = [0,0,0,0,0];
var tareData = [0,0,0,0,0];
var conversion = .0205/4;
var totWeight = 0;
var myLoadCellCounter = 0;
var avgFBDist = 0;
var avgLRDist = 0;

var myCOMObject;

function initWeighToolPage() {
	console.log('weighToolPage Initializing');

	//Instantiate our graphic objects
	initScaleSliderBars();
	initDetailedInfoSection();
	init3DScaleObject();

	//Instantiate our communication object
	myCOMObject = new ArduinoCommunicationObject();
	myCOMObject.registerPinCallback(96, onLoadCellData);
	myCOMObject.registerPinCallback(97, onLoadCellData);
	myCOMObject.registerPinCallback(98, onLoadCellData);
	myCOMObject.registerPinCallback(99, onLoadCellData);
	myCOMObject.isDebugging = false;
}

function btnHelpClicked() {
	console.log('help');
	alert("Step 1 - Press the 'Connect' button and wait 2-3 seconds\nStep 2 - Press the 'Tare' button if the scale doesn't read 0lb or 0kg\nStep 3 - Assist patient onto scale\nStep 4 - With the patient sitting still, press the 'Weigh' button to display the current data");
}

function btnConnectClicked() {
	if(myCOMObject.isConnected) {
		document.getElementById('toolBarButtonTwo').innerHTML = 'Connect';
		myCOMObject.stopPollingLoadCells();
		myCOMObject.closeWebSocket();
	} else {
		myCOMObject.initWebSocket();
		window.setTimeout(function() {
			myCOMObject.startPollingLoadCells();
			console.log('Timeout Called!');
		}, 3000);
		document.getElementById('toolBarButtonTwo').innerHTML = 'Disconnect';
	}

}

function btnWeighClicked() {
	console.log('weigh');
	if(totWeight > 40) {
		alert('Total Weight\n'+(totWeight).toFixed(1)+'lb\n\nLeft-To-Right Distribution\n'+(avgLRDist*100).toFixed(0)+':'+((1-avgLRDist)*100).toFixed(0)+'\n\nFront-To-Back Distribution\n'+((1-avgFBDist)*100).toFixed(0)+':'+(avgFBDist*100).toFixed(0));
	}

}

function btnTareClicked() {
	console.log('Taring data');
	tareData[1] = lcData[1];
	tareData[2] = lcData[2];
	tareData[3] = lcData[3];
	tareData[4] = lcData[4];

}

function toggledPounds() {
	console.log('pounds selected');
	document.getElementById('toolBarDisplayRight').innerHTML = '+/- .5 lb';
	isMetric = false;
	for(i=0; i<4; i++) {
		myScaleRadials[i].setUnitSymbol('lb');
	}
}

function toggledKilograms() {
	console.log('kilos selected');
	document.getElementById('toolBarDisplayRight').innerHTML = '+/- .2 kg';
	isMetric = true;
	for(i=0; i<4; i++) {
		myScaleRadials[i].setUnitSymbol('kg');
	}
}

function initScaleSliderBars() {
	document.getElementById('sliderBarContainer').style.display = 'block';
	var myHandleScale = document.getElementById('sliderBarHandle');
	var myBarScale = document.getElementById('sliderBar');
	if(myHandleScale && myBarScale) {
		mySliderBar = new horizontalSliderBar();
		mySliderBar.initialize('mySliderBar', myBarScale, myHandleScale, function(val) {handleScaleSliderBar(val)}, 0, 360, 180, 5); 
	}
}


function handleScaleSliderBar(val) {
	// console.log('Scale Bar:'+val);
	setXYZ(val+145);
}

function initDetailedInfoSection() {
	initWeightAnalysisGraphics();
}


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
				if(isMetric) myScaleRadials[3].setProgress(lcData[1]*lb_to_kg);
				else myScaleRadials[3].setProgress(lcData[1]);
				myScaleRadials[3].redraw();
				break;
			case 97:
				lcData[2] = lcValue - tareData[2];
				if(lcData[2] < 0) lcData[2] = 0;
				if(isMetric) myScaleRadials[0].setProgress(lcData[2]*lb_to_kg);
				else myScaleRadials[0].setProgress(lcData[2]);
				myScaleRadials[0].redraw();
				break;
			case 98:
				lcData[3] = lcValue - tareData[3];
				if(lcData[3] < 0) lcData[3] = 0;
				if(isMetric) myScaleRadials[1].setProgress(lcData[3]*lb_to_kg);
				else myScaleRadials[1].setProgress(lcData[3]);
				myScaleRadials[1].redraw();
				break;
			case 99:
				lcData[4] = lcValue - tareData[4];
				if(lcData[4] < 0) lcData[4] = 0;
				if(isMetric) myScaleRadials[2].setProgress(lcData[4]*lb_to_kg);
				else myScaleRadials[2].setProgress(lcData[4]);
				myScaleRadials[2].redraw();
				break;
		}
		} 
		console.log('Counter:'+myLoadCellCounter);
		if(myLoadCellCounter == 3) {
			updateTotalWeight();
			updateDistros();
			myLoadCellCounter = 0;
		}
	} else {
		console.log(data);
	}
}


function updateTotalWeight() {
	totWeight = lcData[1] + lcData[2] + lcData[3] + lcData[4];
	if(isMetric) document.getElementById('toolBarDisplayMain').innerHTML = (totWeight*lb_to_kg).toFixed(1);
	else document.getElementById('toolBarDisplayMain').innerHTML = (totWeight).toFixed(1);
}

function updateDistros() {
	if(totWeight > 25) {
		var frontToBackDist = (lcData[1] + lcData[2]) / totWeight;
		var backToFrontDist = (lcData[3] + lcData[4]) / totWeight;
		avgFBDist = 1-((frontToBackDist + (1-backToFrontDist)) / 2);
		console.log('FB Dist: '+avgFBDist);
		if(isMetric) myWeightDistSideView.updateDistributionValues(1-avgFBDist, totWeight*lb_to_kg);
		else myWeightDistSideView.updateDistributionValues(1-avgFBDist, totWeight, isMetric);

		var leftToRightDist = (lcData[2] + lcData[3]) / totWeight;
		var rightToLeftDist = (lcData[1] + lcData[4]) / totWeight;
		avgLRDist = 1-((leftToRightDist + (1-rightToLeftDist)) / 2);
		console.log('LR Dist: '+avgLRDist);
		if(isMetric) myWeightDistFrontView.updateDistributionValues(avgLRDist, totWeight*lb_to_kg);
		else myWeightDistFrontView.updateDistributionValues(avgLRDist, totWeight, isMetric);
		
	} else {
		console.log("Invalid weight distros!");
	}
}

window.addEventListener('load', initWeighToolPage, false);
window.addEventListener('unload', myCOMObject.closeWebSocket, false);
window.onbeforeunload = myCOMObject.closeWebSocket;

// function toggleConnectionMenu(elem) {
// 	if(document.getElementById('SDDM_Container').style.display == 'block') document.getElementById('SDDM_Container').style.display = 'none';
	
// 	console.log('toggleConnectionMenu called');
// 	var myMenu = document.getElementById('CDDM_Container');
// 	if(document.getElementById('CDDM_wrapper')) {
// 		if(myMenu.style.display == 'none') myMenu.style.display = 'block';
// 		else myMenu.style.display = 'none';
// 		console.log(myMenu.style.display);
// 	} else {
// 		myMenu.style.position = 'absolute';
// 		myMenu.innerHTML = connectionMenuHTML;
// 		myMenu.style.top = document.getElementById('header').style.height;
// 		myMenu.style.display = 'block';
// 	}
// }

// function toggleSettingsMenu(elem) {
// 	if(document.getElementById('CDDM_Container').style.display == 'block') document.getElementById('CDDM_Container').style.display = 'none';
	
// 	console.log('toggleSettingsMenu called');
// 	var myMenu = document.getElementById('SDDM_Container');
// 	if(document.getElementById('SDDM_wrapper')) {
// 		if(myMenu.style.display == 'none') myMenu.style.display = 'block';
// 		else myMenu.style.display = 'none';
// 		console.log(myMenu.style.display);
// 	} else {
// 		myMenu.style.position = 'absolute';
// 		myMenu.innerHTML = settingsMenuHTML;
// 		myMenu.style.top = document.getElementById('header').style.height;
// 		myMenu.style.display = 'block';
// 	}
// }

// connectionMenuHTML = '<div id="CDDM_wrapper">  <table id="CDDM_table">  <tr id="topRow">   <td>Status: </td><td></td> <td class="conInfo" id="CDDM_connectionStatus">Connected</td>  </tr>  <tr>   <td>Ping: </td> <td></td><td class="conInfo" id="CDDM_connectionPing">200ms</td>  </tr>  <tr>   <td>Load: </td> <td></td><td class="conInfo" id="CDDM_connectionHealth">L/M/H</td>  </tr>  <tr>   <td>Uptime:</td><td></td> <td class="conInfo" id="CDDM_connectionUpTime">5h 43m</td>  </tr>  <th colspan="3"><div class="onoffswitch">   <button type="button" onclick="initiateCommunication()" class="aButton" id="btnConnection">Click me</button>   </th>  </table> </div>';
// connectionMenuHTML = '<div id="CDDM_wrapper">  <table id="CDDM_table"><th colspan="3">Status</th> <tr></tr><th colspan="3"><div class="onoffswitch">   <div  id="toggleContainer" class="onoffswitch"><input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="myonoffswitch" checked><label class="onoffswitch-label" for="myonoffswitch"><div class="onoffswitch-inner"></div><div class="onoffswitch-switch"></div></label></div></th><tr><td>Ping: </td> <td></td><td class="conInfo" id="CDDM_connectionPing">200ms</td>  </tr>  <tr>   <td>Load: </td> <td></td><td class="conInfo" id="CDDM_connectionHealth">L/M/H</td>  </tr>  <tr>   <td>Uptime:</td><td></td> <td class="conInfo" id="CDDM_connectionUpTime">5h 43m</td>  </tr> </table></div>';
// settingsMenuHTML = '<div id="SDDM_wrapper">  <table id="SDDM_table"><tr><td>Hints</td><td></td><td><div class="toggleswitch"><input type="checkbox" name="toggleswitch" class="toggleswitch-checkbox" id="toggleHints" onclick="hintsToggled(this)"><label class="toggleswitch-label" for="toggleHints"><div class="toggleswitch-inner"></div><div class="toggleswitch-switch"></div></label></div></td></tr><tr><td>Console</td><td></td><td><div class="toggleswitch"><input type="checkbox" name="toggleswitch" class="toggleswitch-checkbox" id="toggleConsole" onclick="consoleToggled(this)"><label class="toggleswitch-label" for="toggleConsole"><div class="toggleswitch-inner"></div><div class="toggleswitch-switch"></div></label></div></td></tr><tr><td>Extended Controls</td><td></td><td><div class="toggleswitch"><input type="checkbox" name="toggleswitch" class="toggleswitch-checkbox" id="toggleExtControls" onclick="extControlsToggled(this)"><label class="toggleswitch-label" for="toggleExtControls"><div class="toggleswitch-inner"></div><div class="toggleswitch-switch"></div></label></div></td></tr></table> </div>';

// function hintsToggled(elem) {
// 	console.log('hints toggled');
// }
// function consoleToggled(elem) {
// 	console.log('console toggled');
// 	var myConsole = document.getElementById('consoleHolder');
// 	if(document.getElementById('toggleConsole').checked) {
// 		myConsole.style.display = 'block';
// 		myConsole.style.top = (window.innerHeight-250)+'px';
// 		myConsole.style.left = '0px';
// 	} else {
// 		myConsole.style.display = 'none';
// 	}
// }
// function extControlsToggled(elem) {
// 	console.log('extended controls toggled');
// 	var myControls = document.getElementById('extControlsHolder');
// 	if(document.getElementById('toggleExtControls').checked) {
// 		myControls.style.display = 'block';
// 	} else {
// 		myControls.style.display = 'none';
// 	}
// }
// function toggleSettingsMenu(elem) {
// 	console.log('toggleSettingsMenu called');
// 	var myMenu = document.getElementById('SDDM_Container');
// 	if(document.getElementById('SDDM_wrapper')) {
// 		if(myMenu.style.display == 'none') myMenu.style.display = 'block';
// 		else myMenu.style.display = 'none';
// 		console.log(myMenu.style.display);
// 	} else {
// 		myMenu.style.position = 'absolute';
// 		myMenu.innerHTML = settingsMenuHTML;
// 		myMenu.style.top = '44px';
// 		myMenu.style.display = 'block';
// 	}
// }

// settingsMenuHTML = '';




function initWeightAnalysisGraphics() {
	myWeightDistSideView = new weightAnalysisGraphicObject();
	myWeightDistSideView.belongsTo = 'quad4DistributionDetailsContainer';
	myWeightDistSideView.drawWheelchairDistribution('myWeightDistSideView', false, null, 300);
	// myWeightDistSideView.updateDistributionValues(.35, 250);

	myWeightDistFrontView = new weightAnalysisGraphicObject();
	myWeightDistFrontView.belongsTo = 'quad1DistributionDetailsContainer';
	myWeightDistFrontView.drawWheelchairDistribution('myWeightDistFrontView', true, null, 300);
	// myWeightDistFrontView.updateDistributionValues(.5, 250);

	myTiltedLeftWheelchair = new weightAnalysisGraphicObject();
	myTiltedLeftWheelchair.belongsTo = 'leftChairHolder';
	myTiltedLeftWheelchair.drawWheelchairTilted('myTiltedLeftWheelchair', 1, 0, 250);
	// myTiltedLeftWheelchair.updateCogValues(10);

	myTiltedRightWheelchair = new weightAnalysisGraphicObject();
	myTiltedRightWheelchair.belongsTo = 'rightChairHolder';
	myTiltedRightWheelchair.drawWheelchairTilted('myTiltedRightWheelchair', 0, 0, 250);
	// myTiltedRightWheelchair.updateCogValues(10);
	
	myTiltedBackWheelchair = new weightAnalysisGraphicObject();
	myTiltedBackWheelchair.belongsTo = 'backChairHolder';
	myTiltedBackWheelchair.drawWheelchairTilted('myTiltedBackWheelchair', 2, 0, 250);
	// myTiltedBackWheelchair.updateCogValues(10);

}


var touchStartX;
var touchStartY;
var scaleXRot = 145;
var scaleXRotLast = 145;
var sensitivity = 2;
if(window.innerWidth/360 >= 1) {
    sensitivity = Math.round(window.innerWidth/360);
    console.log('Setting sensitivity to '+sensitivity);
} 

function handleTouchStart(e) {
    console.log(e.touches[0].target.id);
    if(e.touches[0].target.id == 'scaleVisualHolder') {
        touchStartX = e.touches[0].pageX;
        touchStartY = e.touches[0].pageY;
        console.log(touchStartX+','+touchStartY);
    }
}

var touchCounter = 0;
function handleTouchMove(e) {
    touchCounter++;
    touch = e.touches[0];

    if(touchCounter%20 == 0) {
        touchStartX = touch.pageX;
        touchStartY = touch.pageY;
        scaleXRot = scaleXRotLast;
        touchCounter = 0;
    }

    if(touch.target.id == 'scaleVisualHolder' || touch.target.id == 'myScaleObjectWeightDistributionCanvas') {
        if(1.5*Math.abs(touch.pageX-touchStartX) >= Math.abs(touch.pageY-touchStartY)) {
            e.preventDefault();
            // console.log('roatating the scale figure:'+(touchStartX-touch.pageX));
            if((touch.pageX-touchStartX)%sensitivity == 0) {
                setXYZ((touchStartX-touch.pageX)/sensitivity+scaleXRot);
                scaleXRotLast = (touchStartX-touch.pageX)/sensitivity+scaleXRot;
            }
        }
    }
}

function handleTouchEnd(e) {
    scaleXRot = scaleXRotLast;
}


window.addEventListener('touchstart', handleTouchStart, false);
window.addEventListener('touchmove', handleTouchMove, false);
window.addEventListener('touchend', handleTouchEnd, false);






/******************************/
//Horizontal Slider Obejct Code
/******************************/
function horizontalSliderBar() {
	this.debug = false;

	this.initialize = initialize;
	this.updateValues = updateValues;
	this.issueCallback = issueCallback;
	this.updateValuesWithoutContext = updateValuesWithoutContext;
	// this.handleMouseDown = handleMouseDown;
	// this.handleMousUp = handleMouseUp;
	// this.handleMouseMove = handleMouseMove;

	this.userDefinedCallback;
	this.onMouseDown = false;
	this.bar;
	this.handle;

	this.handleWidth = 0;
	
	this.minVal = 0;
	this.maxVal = 0;
	this.stepVal = 0;
	this.minX = 0;
	this.maxX = 0;
	this.yVal = 0;
	this.stepVal = 1;
	this.stepValPx = 1;
	this.initPos = 0; 
	this.lastPos = 0;
	this.lastWindowWidth = 0;
	this.currentValue = 0;

	function initialize(id, bar, handle, callback, minValue, maxValue, initValue, stepVal) {
		var myContext = this;
		this.bar = bar;
		this.handle = handle;
		this.userDefinedCallback = callback;
		this.initPos = initValue;
		this.lastWindowWidth = window.innerWidth;

		var barBoundingRectangle = bar.getBoundingClientRect();
		var handleBoundingRectangle = handle.getBoundingClientRect();
		if(this.debug) {
			console.log(barBoundingRectangle.top, barBoundingRectangle.right, barBoundingRectangle.bottom, barBoundingRectangle.left);
			console.log(handleBoundingRectangle.top, handleBoundingRectangle.right, handleBoundingRectangle.bottom, handleBoundingRectangle.left);
		}

		this.handle.style.position = 'relative';
		this.yVal = ((barBoundingRectangle.top - barBoundingRectangle.bottom)/2 - (handleBoundingRectangle.bottom - handleBoundingRectangle.top)/2) +'px';
		this.handle.style.top = this.yVal;

		this.handleWidth = handleBoundingRectangle.right-handleBoundingRectangle.left;

		this.minX = barBoundingRectangle.left+this.handleWidth/2;
		this.maxX = barBoundingRectangle.right-this.handleWidth/2;
		this.maxVal = maxValue;
		this.minVal = minValue;

		if(stepVal > 0) {
			this.stepValPx = (barBoundingRectangle.right - barBoundingRectangle.left + 1)/((this.maxVal - this.minVal)/(stepVal));
			this.stepVal = stepVal;
		}

		if(initValue >= 0) {
			this.handle.style.left = (this.minX+(initValue/(this.maxVal-this.minVal)*(this.maxX-this.minX))-this.handleWidth/2)+'px';
			this.currentValue = initValue;
		}

		window.onresize = function(event) {updateValues(event, myContext)};
		this.handle.onmousedown = function(event) {handleMouseDown(event, myContext)};
		window.onmouseup = function(event) {handleMouseUp(event, myContext)};
	}
	function updateValues(event, ctx) {
		var barBoundingRectangle = ctx.bar.getBoundingClientRect();
		var handleBoundingRectangle = ctx.handle.getBoundingClientRect();
		if(ctx.debug) {
			console.log(barBoundingRectangle.top, barBoundingRectangle.right, barBoundingRectangle.bottom, barBoundingRectangle.left);
			console.log(handleBoundingRectangle.top, handleBoundingRectangle.right, handleBoundingRectangle.bottom, handleBoundingRectangle.left);
		}
		ctx.handle.style.position = 'relative';
		ctx.yVal = ((barBoundingRectangle.top - barBoundingRectangle.bottom)/2 - (handleBoundingRectangle.bottom - handleBoundingRectangle.top)/2) +'px';
		ctx.handle.style.top = ctx.yVal;

		ctx.handleWidth = handleBoundingRectangle.right-handleBoundingRectangle.left;

		ctx.minX = barBoundingRectangle.left+ctx.handleWidth/2;
		ctx.maxX = barBoundingRectangle.right-ctx.handleWidth/2;

		ctx.stepValPx = (barBoundingRectangle.right - barBoundingRectangle.left + 1)/((ctx.maxVal - ctx.minVal)/(ctx.stepVal));
		if(ctx.lastPos){
			ctx.lastPos = (ctx.lastPos/ctx.lastWindowWidth)*window.innerWidth;
			ctx.handle.style.left = (Math.round((ctx.lastPos-ctx.minX)/ctx.stepValPx)*ctx.stepValPx+ctx.minX+ctx.handleWidth/2)+'px';
		} else {
			ctx.handle.style.left = (ctx.minX+(ctx.initPos/(ctx.maxVal-ctx.minVal)*(ctx.maxX-ctx.minX))-ctx.handleWidth/2)+'px';			
		}
		ctx.lastWindowWidth = window.innerWidth;
	}
	function updateValuesWithoutContext() {
		var barBoundingRectangle = this.bar.getBoundingClientRect();
		var handleBoundingRectangle = this.handle.getBoundingClientRect();
		if(this.debug) {
			console.log(barBoundingRectangle.top, barBoundingRectangle.right, barBoundingRectangle.bottom, barBoundingRectangle.left);
			console.log(handleBoundingRectangle.top, handleBoundingRectangle.right, handleBoundingRectangle.bottom, handleBoundingRectangle.left);
		}
		this.handle.style.position = 'relative';
		this.yVal = ((barBoundingRectangle.top - barBoundingRectangle.bottom)/2 - (handleBoundingRectangle.bottom - handleBoundingRectangle.top)/2) +'px';
		this.handle.style.top = this.yVal;

		this.handleWidth = handleBoundingRectangle.right-handleBoundingRectangle.left;

		this.minX = barBoundingRectangle.left+this.handleWidth/2;
		this.maxX = barBoundingRectangle.right-this.handleWidth/2;

		this.stepValPx = (barBoundingRectangle.right - barBoundingRectangle.left + 1)/((this.maxVal - this.minVal)/(this.stepVal));
		if(this.lastPos){
			this.lastPos = (this.lastPos/this.lastWindowWidth)*window.innerWidth;
			this.handle.style.left = (Math.round((this.lastPos-this.minX)/this.stepValPx)*this.stepValPx+this.minX+this.handleWidth/2)+'px';
		} else {
			this.handle.style.left = (this.minX+(this.initPos/(this.maxVal-this.minVal)*(this.maxX-this.minX))-this.handleWidth/2)+'px';			
		}
		this.lastWindowWidth = window.innerWidth;
	}
	function issueCallback(curVal) {
		this.userDefinedCallback(curVal);
	}
	function handleMouseDown(event, ctx) {
		if(ctx.debug) console.log('handleMouseDown called!');
		if(!ctx.onMouseDown) {
			window.addEventListener('mousemove', function (event) {handleMouseMove(event, ctx)}, false);
			ctx.onMouseDown = true;
		}
	}
	function handleMouseUp(event, ctx) {
		if(ctx.debug)console.log('handleMouseUp called');
		ctx.onMouseDown = false;
		window.removeEventListener('mousemove', function (event) {handleMouseMove(event, ctx)}, false) ;

	}
	function handleMouseMove(event, ctx) {
		if(ctx.onMouseDown) {
		if(ctx.debug)console.log('mouse moved');
		var val = Math.round((event.clientX - ctx.minX)/ctx.stepValPx);
		if(val*ctx.stepValPx > ctx.maxX-ctx.handleWidth) {
			ctx.handle.style.left = (ctx.maxX)+'px';
		} else if(val*ctx.stepValPx < ctx.minX-ctx.handleWidth*2) {
			ctx.handle.style.left = (ctx.minX-ctx.handleWidth)+'px';
		} else {
			ctx.handle.style.left = ((val*ctx.stepValPx)+ctx.minX-ctx.handleWidth)+'px';
		}	
		if(parseInt(ctx.handle.style.left) !=  ctx.lastPos) {
			if(val*ctx.stepVal > ctx.maxVal) {
				ctx.issueCallback(ctx.maxVal);
				ctx.currentValue = ctx.maxVal;
			}else if(val*ctx.stepVal < ctx.minVal) {
				ctx.issueCallback(ctx.minVal);
				ctx.currentValue = ctx.minVal;
			} else {
				ctx.issueCallback(val*ctx.stepVal);
				ctx.currentValue = val*ctx.stepVal;
			}
		}
		ctx.lastPos = parseInt(ctx.handle.style.left);
		} else {
			window.removeEventListener('mousemove', arguments.callee, false);
		}
	}
}

/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/







/******************************/
//Initialize Scale Obejct Code
/******************************/
function init3DScaleObject() {
	//Global variables
	globalColors = new Array();
	globalColors = ['#36BAFF','#43cc23','#FF3656','#BA36FF'];
	
	armWidth = 0;
	isMouseDown = false;
	mouseXPos = 0;
	mouseYPos = 0;
			
	myScaleObject = new my3DScaleObject();
	myScaleObject.isChildOf('scaleVisualHolder');
	myScaleObject.initialize('myScaleObject', window.innerWidth/3.75);

	radHeight = 50;

	addRadialToScaleObject(myScaleObject);
	
	document.getElementById('mainVisualHolder').style.height = window.innerWidth/3.75*1.4+'px';
	document.getElementById('scaleVisualSpan').style.lineHeight = window.innerWidth/3.75*1.4+'px';


	rtime = new Date(1, 1, 2000, 12,00,00);
	timeout = false;
	delta = 750;
	window.onresize = function() {
	    rtime = new Date();
	    if (timeout === false) {
	        timeout = true;
	        setTimeout(resizeEnd, delta);
	    }
	};           
}

function addRadialToScaleObject(scaleObject) {
	//var radHeight = 50;
	if(scaleObject.scaleSize){
		var sizeWeight = parseInt(scaleObject.scaleSize)/350;
	} else{
		var sizeWeight = 1;
	}
	if(typeof scaleObject != 'undefined') {
		myScaleRadials = new Array();
		for(i=0; i<4; i++) {
			myScaleRadials[i] = new radialValueObject();
			myScaleRadials[i].appendTo('myScaleObjectContainer');
			myScaleRadials[i].initialize('radQuad'+(i+1));
			myScaleRadials[i].setProgressText((30*sizeWeight)+'px Tohoma');
			myScaleRadials[i].setLineColor(globalColors[i]);
			myScaleRadials[i].setTextColor(globalColors[i]);
			myScaleRadials[i].setIsBubbled(true);
			myScaleRadials[i].setHasRadialBackground(true, 'rgba(50, 50, 50, 0.2)');
			myScaleRadials[i].setMinMaxValue(0,275);
			myScaleRadials[i].setUnitSymbol('lb', (18*sizeWeight)+'px Tohoma');
			myScaleRadials[i].setProgress(237);
			myScaleRadials[i].setLineWidth(5*sizeWeight);
			if(myScaleObject.isPerspectiveCapable) {
			myScaleRadials[i].setPosition(1,1);
			myScaleRadials[i].setDiameter(100*sizeWeight);
			} else {
				switch(i) {
					case 0:
						myScaleRadials[i].setPosition(parseInt(myScaleObject.topFaceContainer.style.left)+parseInt(myScaleObject.topFaceContainer.style.width)+myScaleRadials[i].diameter*.75, 0);
						break;
					case 1:
						myScaleRadials[i].setPosition(parseInt(myScaleObject.topFaceContainer.style.left)+parseInt(myScaleObject.topFaceContainer.style.width)+myScaleRadials[i].diameter*.75, parseInt(myScaleObject.topFaceContainer.style.height)+myScaleRadials[i].diameter*.4);
						break;
					case 2:
						myScaleRadials[i].setPosition(parseInt(myScaleObject.topFaceContainer.style.left)-myScaleRadials[i].diameter*.75, parseInt(myScaleObject.topFaceContainer.style.height)+myScaleRadials[i].diameter*.4);
						break;
					case 3:
						myScaleRadials[i].setPosition(parseInt(myScaleObject.topFaceContainer.style.left)-myScaleRadials[i].diameter*.75, 0);
						break;
				}
			}	
			myScaleRadials[i].redraw();
		}
		scaleObject.radialArray = myScaleRadials;
		setXYZ();

	}else {
		console.log('radial append to scale failed');
		return false;
	}
}


/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/ 


function handleQuadRadClicked(ctx) {
	if(typeof myScaleObject != 'undefined') {
		for(i=0; i<myScaleObject.radialArray.length; i++) {
			if(ctx.element.id == myScaleObject.radialArray[i].element.id) {
				console.log(myScaleObject.radialArray[i].element.id+' was clicked');
			}
		}
	}
}

/******************************/
//3D Scale Object
/******************************/
function my3DScaleObject() {
	//Drawing Functions
	this.initialize = initialize;
	this.isChildOf = isChildOf;
	this.drawLeftRightArms = drawLeftRightArms;
	this.drawSides = drawSides;
	this.drawBottomInnerFace = drawBottomInnerFace;
	this.drawTopFace = drawTopFace;
	this.drawTopFaceGrid = drawTopFaceGrid;
	this.drawTopFaceWheelMap = drawTopFaceWheelMap;
	this.drawTopFaceWeightDist = drawTopFaceWeightDist;
	this.redrawScale = redrawScale;
	
	
	this.drawEpsilonBall = drawEpsilonBall;
	
	//Data Attachment Functions
	this.setIsWheelMappingVisible = setIsWheelMappingVisible;
	this.setIsWheelLocationVisible = setIsWheelLocationVisible;
	this.setIsWeightDistributionVisible = setIsWeightDistributionVisible;
	this.setIsTopGridVisible = setIsTopGridVisible;
	//this.isCOGLineVisible = isCOGLineVisible;
	//this.isEpsilonBallVisible = isEpsilonBallVisible;
	
	//3D Mapping Funcitons
	//this.setPerspective = setPerspective;
	//this.setRotation = setRotation;
	//this.isRotationEnabled = isRotationEnabled;
	
	//Property Setters
	//this.setContainerSize = setContainerSize;
	//this.setScaleColor = setScaleColor;

	function isChildOf(elementsID) {
		if(document.getElementById(elementsID)) {
			this.belongsTo = elementsID;
		}else {
			console.log('Error! Unable to append scale object, '+elementsID+' not found');
		}
	}
	
	function setIsWheelMappingVisible(isVisible) {
		if(typeof isVisible == 'boolean') {
			this.isWheelMappingVisible = isVisible;
		}
	}
	
	function setIsWheelLocationVisible(isVisible) {
		if(typeof isVisible == 'boolean') {
			this.isWheelLocationVisible = isVisible;
		}
	}
	
	function setIsTopGridVisible(isVisible) {
		if(typeof isVisible == 'boolean') {
			this.isTopGridVisible = isVisible;
		}
	}
	
	function setIsWeightDistributionVisible(isVisible) {
		if(typeof isVisible == 'boolean') {
			this.isWeightDistVisible = isVisible;
		}
	}

	
	function setContainerSize(widthInPx, heightInPx) {
		if(widthInPx) {
			this.containerWidth = widthInPxOrPercent;
		}
		if(heightInPx) {
			this.containerHeight = heightInPxOrPercent;
		}
	}
	
	function redrawScale() {
		console.log('redrawing');
		//this.drawTopFace();
		//this.drawLeftRightArms();
	}
	
	
	function initialize(scaleID, size) {
		//Check to see if the browser is capable of webkitTransforms (determines 3D ability)
		this.isPerspectiveCapable = true;
		this.scaleSize = parseInt(size)+'px';


		//Set some default values
		this.containerWidth = parseInt(this.scaleSize)+'px';
		this.containerHeight = parseInt(this.scaleSize)*1.2+'px';
		this.containerBGColor = 'rbga(000,000,000,0.0)';
		this.scaleColor = '#F3F3F3';
		this.objectsID = scaleID;
		this.isTopGridVisible = true;
		this.isWheelMappingVisible = true;
		this.isWheelLocationVisible = true;
		this.isWeightDistVisible = true;
		
		//create view container
		this.viewContainer = document.createElement('div');
		this.viewContainer.id = this.objectsID+'Container';
		this.viewContainer.className = '3DScaleObjectContainer';
		this.viewContainer.onmouseover = function() {handleMouseOverScaleContainer(this)};
		this.viewContainer.onmouseout = function() {handleMouseOutScaleContainer(this)};
		this.viewContainer.style.height = this.containerHeight;
		this.viewContainer.style.width = this.containerWidth;
		if(this.isPerspectiveCapable) {
			this.viewContainer.style.webkitTransformStyle = 'preserve-3d';
			this.viewContainer.style.MozTransformStyle = 'preserve-3d';
			this.viewContainer.style.msTransformStyle = 'preserve-3d';
			this.viewContainer.style.OTransformStyle = 'preserve-3d';
		}
		this.viewContainer.style.background = this.containerBGColor;
		this.viewContainer.style.position = 'relative';
		if(this.belongsTo) {
			document.getElementById(this.belongsTo).appendChild(this.viewContainer);
		}else {
			document.body.appendChild(this.viewContainer);
		}
			
		//Proceed to draw scale obejct
		this.drawTopFace();
		if(this.isPerspectiveCapable) {
			this.drawLeftRightArms();
		}
		
		if(this.isPerspectiveCapable) {
			//Update Perspective...
			setXYZ();
			tiltScale(0);
		}
		
	}
	
	function drawLeftRightArms() {
		//Draw Left Arm
		this.leftArmCanvas = document.createElement('canvas');
		this.leftArmCanvas.id = this.objectsID+'LeftArmCanvas';
		this.leftArmCanvas.width = parseInt(this.topFaceContainer.style.width)/3;
		armWidth = this.leftArmCanvas.width;
		this.leftArmCanvas.height = parseInt(this.topFaceContainer.style.height);
		var tempHalf = this.leftArmCanvas.width/2;
		this.leftArmCanvas.style.webkitTransform = 'rotateY(-90deg) translateX('+tempHalf+'px)';
		this.leftArmCanvas.style.MozTransform = 'rotateY(-90deg) translateX('+tempHalf+'px)';
		this.leftArmCanvas.style.msTransform = 'rotateY(-90deg) translateX('+tempHalf+'px)';
		this.leftArmCanvas.style.OTransform = 'rotateY(-90deg) translateX('+tempHalf+'px)';
		
		//Append and set position
		document.getElementById(this.viewContainer.id).appendChild(this.leftArmCanvas);
		this.leftArmCanvas.style.position = 'absolute';
		this.leftArmCanvas.style.top = this.topFaceContainer.style.top;
		this.leftArmCanvas.style.left = parseInt(this.topFaceContainer.style.left)-parseInt(this.leftArmCanvas.width)/2+'px';
		
		this.leftArmContext = this.leftArmCanvas.getContext('2d');
		this.leftArmContext.globalAlpha = 0.5;
		this.leftArmContext.beginPath()
		this.leftArmContext.moveTo(0,0);
		this.leftArmContext.lineTo(0, parseInt(this.topFaceContainer.style.height)/10);
		this.leftArmContext.lineTo(this.leftArmCanvas.width*(9/10), parseInt(this.topFaceContainer.style.height)/5);
		this.leftArmContext.lineTo(this.leftArmCanvas.width*(9/10), this.leftArmCanvas.height);
		this.leftArmContext.lineTo(this.leftArmCanvas.width, this.leftArmCanvas.height);
		this.leftArmContext.lineTo(this.leftArmCanvas.width, 0);
		this.leftArmContext.closePath();
		this.leftArmContext.fillStyle = this.scaleColor;
		this.leftArmContext.fill();
		this.leftArmContext.stroke();

		
		
		
		//Draw Right Arm
		this.rightArmCanvas = document.createElement('canvas');
		this.rightArmCanvas.id = this.objectsID+'RightArmCanvas';
		this.rightArmCanvas.width = parseInt(this.topFaceContainer.style.width)/3;
		this.rightArmCanvas.height = parseInt(this.topFaceContainer.style.height);
		var tempHalf = this.rightArmCanvas.width/2;
		this.rightArmCanvas.style.webkitTransform = 'rotateY(90deg) translateX(-'+tempHalf+'px)';
		this.rightArmCanvas.style.MozTransform = 'rotateY(90deg) translateX('+tempHalf+'px)';
		this.rightArmCanvas.style.msTransform = 'rotateY(90deg) translateX('+tempHalf+'px)';
		this.rightArmCanvas.style.OTransform = 'rotateY(90deg) translateX('+tempHalf+'px)';
		
		//Append and set position
		document.getElementById(this.viewContainer.id).appendChild(this.rightArmCanvas);
		this.rightArmCanvas.style.position = 'absolute';
		this.rightArmCanvas.style.top = this.topFaceContainer.style.top;
		this.rightArmCanvas.style.left = parseInt(this.topFaceContainer.style.left)+parseInt(this.topFaceContainer.style.width)-this.rightArmCanvas.width/2+'px';
		
		this.rightArmContext = this.rightArmCanvas.getContext('2d');
		this.rightArmContext.globalAlpha = 0.5;
		this.rightArmContext.beginPath()
		this.rightArmContext.moveTo(0,0);
		this.rightArmContext.lineTo(0, parseInt(this.topFaceContainer.style.height)/10);
		this.rightArmContext.lineTo(this.rightArmCanvas.width*(9/10), parseInt(this.topFaceContainer.style.height)/5);
		this.rightArmContext.lineTo(this.rightArmCanvas.width*(9/10), this.leftArmCanvas.height);
		this.rightArmContext.lineTo(this.rightArmCanvas.width, this.rightArmCanvas.height);
		this.rightArmContext.lineTo(this.rightArmCanvas.width, 0);
		this.rightArmContext.closePath();
		this.rightArmContext.fillStyle = this.scaleColor;
		this.rightArmContext.fill();
		this.rightArmContext.stroke();	
	}
	
	function drawSides(){
		//Draw Back Face
		this.backSideContainer = document.createElement('div');
		this.backSideContainer.id = this.objectsID+'BackSideContainer';
		this.backSideContainer.className = 'scaleObjectSide';
		this.backSideContainer.style.width = parseInt(this.topFaceContainer.style.width)+'px';
		this.backSideContainer.style.height = parseInt(this.backSideContainer.style.width)/10+'px';
		this.backSideContainer.style.background = this.scaleColor;
		var tempHalf = parseInt(this.backSideContainer.style.height)/2;
		this.backSideContainer.style.webkitTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		this.backSideContainer.style.MozTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		this.backSideContainer.style.msTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		this.backSideContainer.style.OTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		
		//Append and set position
		document.getElementById(this.viewContainer.id).appendChild(this.backSideContainer);
		this.backSideContainer.style.position = 'absolute';
		this.backSideContainer.style.top = parseInt(this.topFaceContainer.style.top)-parseInt(this.backSideContainer.style.height)/2+'px';
		this.backSideContainer.style.left = this.topFaceContainer.style.left;
		
		//Create and append canvas here if necessary...
		
		//Draw Front Face
		this.frontSideContainer = document.createElement('div');
		this.frontSideContainer.id = this.objectsID+'FrontSideContainer';
		this.frontSideContainer.className = 'scaleObjectSide';
		this.frontSideContainer.style.width = parseInt(this.topFaceContainer.style.width)+'px';
		this.frontSideContainer.style.height = parseInt(this.frontSideContainer.style.width)/10+'px';
		this.frontSideContainer.style.background = this.scaleColor;
		var tempHalf = parseInt(this.frontSideContainer.style.height)/2;
		this.frontSideContainer.style.webkitTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		this.frontSideContainer.style.MozTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		this.frontSideContainer.style.msTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		this.frontSideContainer.style.OTransform = 'rotateX(90deg) translateY(-'+tempHalf+'px)';
		
		//Append and set position
		document.getElementById(this.viewContainer.id).appendChild(this.frontSideContainer);
		this.frontSideContainer.style.position = 'absolute';
		this.frontSideContainer.style.top = parseInt(this.topFaceContainer.style.top)+parseInt(this.topFaceContainer.style.height)-parseInt(this.frontSideContainer.style.height)/2+'px';
		this.frontSideContainer.style.left = this.topFaceContainer.style.left;
		
		//Create and append canvas here if necessary...
		
		//Draw Left Face
		this.leftSideContainer = document.createElement('div');
		this.leftSideContainer.id = this.objectsID+'LeftSideContainer';
		this.leftSideContainer.className = 'scaleObjectSide';
		this.leftSideContainer.style.width = this.frontSideContainer.style.height;
		this.leftSideContainer.style.height = this.topFaceContainer.style.height;
		this.leftSideContainer.style.background = this.scaleColor;
		var tempHalf = parseInt(this.leftSideContainer.style.width)/2;
		this.leftSideContainer.style.webkitTransform = 'rotateY(-90deg) translateX(-'+tempHalf+'px)';
		this.leftSideContainer.style.MozTransform = 'rotateY(-90deg) translateX(-'+tempHalf+'px)';
		this.leftSideContainer.style.msTransform = 'rotateY(-90deg) translateX(-'+tempHalf+'px)';
		this.leftSideContainer.style.OTransform = 'rotateY(-90deg) translateX(-'+tempHalf+'px)';
		
		//Append and set position
		document.getElementById(this.viewContainer.id).appendChild(this.leftSideContainer);
		this.leftSideContainer.style.position = 'absolute';
		this.leftSideContainer.style.top = this.topFaceContainer.style.top;
		this.leftSideContainer.style.left = parseInt(this.topFaceContainer.style.left)-parseInt(this.leftSideContainer.style.width)/2+'px';
		
		//Create and append canvas here if necessary...
		
		//Draw Right Face
		this.rightSideContainer = document.createElement('div');
		this.rightSideContainer.id = this.objectsID+'RightSideContainer';
		this.rightSideContainer.className = 'scaleObjectSide';
		this.rightSideContainer.style.width = this.leftSideContainer.style.width;
		this.rightSideContainer.style.height = this.topFaceContainer.style.height;
		this.rightSideContainer.style.background = this.scaleColor;
		var tempHalf = parseInt(this.rightSideContainer.style.width)/2;
		this.rightSideContainer.style.webkitTransform = 'rotateY(-90deg) translateX(-'+tempHalf+'px)';
		this.rightSideContainer.style.MozTransform = 'rotateY(90deg) translateX('+tempHalf+'px)';
		this.rightSideContainer.style.msTransform = 'rotateY(90deg) translateX('+tempHalf+'px)';
		this.rightSideContainer.style.OTransform = 'rotateY(90deg) translateX('+tempHalf+'px)';
		
		//Append and set position
		document.getElementById(this.viewContainer.id).appendChild(this.rightSideContainer);
		this.rightSideContainer.style.position = 'absolute';
		this.rightSideContainer.style.top = this.topFaceContainer.style.top;
		this.rightSideContainer.style.left = parseInt(this.topFaceContainer.style.left)+parseInt(this.topFaceContainer.style.width)-parseInt(this.rightSideContainer.style.width)/2+'px';
		
		//Create and append canvas here if necessary...

		
		
	}	
	function drawBottomInnerFace() {
		//Draw Bottom Face
		this.bottomFaceContainer = document.createElement('div');
		this.bottomFaceContainer.id = this.objectsID+'BottomFaceContainer';
		this.bottomFaceContainer.className = 'scaleObjectSide';
		this.bottomFaceContainer.style.height = this.topFaceContainer.style.height;
		this.bottomFaceContainer.style.width = this.topFaceContainer.style.width;
		this.bottomFaceContainer.style.background = this.scaleColor;
		//Append element and set position
		document.getElementById(this.viewContainer.id).appendChild(this.bottomFaceContainer);
		this.bottomFaceContainer.style.position = 'absolute';
		this.bottomFaceContainer.style.top = this.topFaceContainer.style.top;
		this.bottomFaceContainer.style.left = this.topFaceContainer.style.left;
		this.bottomFaceContainer.style.webkitTransform = 'translateZ(-'+this.backSideContainer.style.height+')';
		this.bottomFaceContainer.style.MozTransform = 'translateZ(-'+this.backSideContainer.style.height+')';
		this.bottomFaceContainer.style.msTransform = 'translateZ(-'+this.backSideContainer.style.height+')';
		this.bottomFaceContainer.style.OTransform = 'translateZ(-'+this.backSideContainer.style.height+')';
		
		//Draw Inner Face
		this.innerFaceCanvas = document.createElement('canvas');
		this.innerFaceCanvas.id = this.objectsID+'InnerFaceCanvas';
		this.innerFaceCanvas.width = parseInt(this.topFaceContainer.style.width);
		this.innerFaceCanvas.height = parseInt(this.topFaceContainer.style.height);
		//Append element and set position
		document.getElementById(this.viewContainer.id).appendChild(this.innerFaceCanvas);
		this.innerFaceCanvas.style.position = 'absolute';
		this.innerFaceCanvas.style.top = this.topFaceContainer.style.top;
		this.innerFaceCanvas.style.left = this.topFaceContainer.style.left;
		this.innerFaceCanvas.style.webkitTransform = 'translateZ(-1px)';
		this.innerFaceCanvas.style.MozTransform = 'translateZ(-1px)';
		this.innerFaceCanvas.style.msTransform = 'translateZ(-1px)';
		this.innerFaceCanvas.style.OTransform = 'translateZ(-1px)';
		//Get context and draw surface
		this.innerFaceContext = this.innerFaceCanvas.getContext('2d');
		this.innerFaceContext.fillStyle = this.scaleColor;
		//this.innerFaceStrokeStyle = '#000'; (default value, no need to set again)
		
		var thickness = parseInt(this.topFaceContainer.style.height)*.075;
		
		this.innerFaceContext.beginPath();
		this.innerFaceContext.moveTo(0,0);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width, 0);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width, this.innerFaceCanvas.height);
		this.innerFaceContext.lineTo(0, this.innerFaceCanvas.height);
		this.innerFaceContext.lineTo(0,0);
		this.innerFaceContext.fill();
		this.innerFaceContext.stroke();
		this.innerFaceContext.closePath();
		
		this.innerFaceContext.lineWidth = 2;		
		//Top Triangle Cut-Out
		this.innerFaceContext.beginPath();
		this.innerFaceContext.moveTo(thickness*1.5, thickness);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width-(thickness*1.5), thickness);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width/2, this.innerFaceCanvas.height/2-(thickness/2));
		this.innerFaceContext.lineTo(thickness*1.5, thickness);
		this.innerFaceContext.globalCompositeOperation = 'source-over';
		this.innerFaceContext.stroke();
		this.innerFaceContext.globalCompositeOperation = 'destination-out';
		this.innerFaceContext.fill();
		
		//Right Triangle Cut-Out
		this.innerFaceContext.moveTo(this.innerFaceCanvas.width-thickness, thickness*1.5);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width-thickness, this.innerFaceCanvas.height-(thickness*1.5));
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width/2+(thickness/2), this.innerFaceCanvas.height/2);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width-thickness, thickness*1.5);
		this.innerFaceContext.globalCompositeOperation = 'source-over';
		this.innerFaceContext.stroke();
		this.innerFaceContext.globalCompositeOperation = 'destination-out';
		this.innerFaceContext.fill();
		
		//Bottom Triangle
		this.innerFaceContext.moveTo(this.innerFaceCanvas.width-(thickness*1.5),this.innerFaceCanvas.height-thickness);
		this.innerFaceContext.lineTo(thickness*1.5, this.innerFaceCanvas.height-thickness);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width/2, this.innerFaceCanvas.height/2+(thickness/2));
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width-(thickness*1.5),this.innerFaceCanvas.height-thickness);
		this.innerFaceContext.globalCompositeOperation = 'source-over';
		this.innerFaceContext.stroke();
		this.innerFaceContext.globalCompositeOperation = 'destination-out';
		this.innerFaceContext.fill();
		
		//Left Triangle
		this.innerFaceContext.moveTo(thickness, this.innerFaceCanvas.height-(thickness*1.5));
		this.innerFaceContext.lineTo(thickness, thickness*1.5);
		this.innerFaceContext.lineTo(this.innerFaceCanvas.width/2-(thickness/2), this.innerFaceCanvas.height/2);
		this.innerFaceContext.lineTo(thickness, this.innerFaceCanvas.height-(thickness*1.5));
		this.innerFaceContext.globalCompositeOperation = 'source-over';
		this.innerFaceContext.stroke();
		this.innerFaceContext.globalCompositeOperation = 'destination-out';
		this.innerFaceContext.fill();
		
		this.innerFaceContext.closePath();
		
	}
	
	function drawTopFace() {
		//Div for surface
		this.topFaceContainer = document.createElement('div');
		this.topFaceContainer.id = this.objectsID+'TopFaceContainer';
		this.topFaceContainer.className = 'scaleObjectSide';
		this.topFaceContainer.style.height = this.scaleSize;
		this.topFaceContainer.style.width =  parseInt(this.topFaceContainer.style.height)*.9+'px';
		this.topFaceContainer.style.background = this.scaleColor;
		this.topFaceContainer.onmousedown = function() {handleMouseDownScaleTopFace(this)};
		this.topFaceContainer.style.position = 'absolute';
		this.topFaceContainer.style.top = parseInt(this.containerHeight)/2-parseInt(this.topFaceContainer.style.height)/2+'px';
		this.topFaceContainer.style.left = parseInt(this.containerWidth)/2-parseInt(this.topFaceContainer.style.width)/2+'px';
		console.log('Scale Object: drawing topFace at top:'+this.topFaceContainer.style.top+' Left:'+this.topFaceContainer.style.left);
		console.log(parseInt(this.containerWidth)/2);
		console.log(parseInt(this.topFaceContainer.style.width)/2);

		if(this.isPerspectiveCapable) {
			this.topFaceContainer.style.webkitTransform = 'translateY(-0.5px)';
			this.topFaceContainer.style.MozTransform = 'translateY(-0.5px)';
			this.topFaceContainer.style.msTransform = 'translateY(-0.5px)';
			this.topFaceContainer.style.OTransform = 'translateY(-0.5px)';
		}
		
		document.getElementById(this.viewContainer.id).appendChild(this.topFaceContainer);
		
		if(this.isPerspectiveCapable) {
			//Draw Sides Now that our scales size is defined...
			this.drawSides();
			this.drawBottomInnerFace();
		}
		
		//Canvas full size grid
		this.topFaceGridCanvas = document.createElement('canvas');
		this.topFaceGridCanvas.width = parseInt(this.topFaceContainer.style.width);
		this.topFaceGridCanvas.height = parseInt(this.topFaceContainer.style.height);
		this.topFaceGridCanvas.id = this.objectsID+'TopFaceGridCanvas';
		
		//Append element, get context and set positon...
		document.getElementById(this.topFaceContainer.id).appendChild(this.topFaceGridCanvas);
		this.topFaceGridContext = this.topFaceGridCanvas.getContext('2d');
		this.topFaceGridCanvas.style.position = 'absolute';
		this.topFaceGridCanvas.top = '0px';
		this.topFaceGridCanvas.left = '0px';

		//Draw Grid on top face
		this.drawTopFaceGrid();
		
		
		//Canvas full size wheel mapping
		this.topFaceWheelMapCanvas = document.createElement('canvas');
		this.topFaceWheelMapCanvas.id = this.objectsID+'WheelMapCanvas';
		this.topFaceWheelMapCanvas.height = parseInt(this.topFaceContainer.style.height);
		this.topFaceWheelMapCanvas.width = parseInt(this.topFaceContainer.style.width);
		
		//Append element, get context and set position...	
		document.getElementById(this.topFaceContainer.id).appendChild(this.topFaceWheelMapCanvas);
		this.topFaceWheelMapContext = this.topFaceWheelMapCanvas.getContext('2d');
		this.topFaceWheelMapCanvas.style.position = 'relative';
		this.topFaceWheelMapCanvas.top = '0px';
		this.topFaceWheelMapCanvas.left = '0px';

		//Create arrays for wheel data...
		this.leftWheelDataFirst = new Array();
		this.rightWheelDataFirst = new Array();
		this.leftWheelDataSecond = new Array();
		this.rightWheelDataSecond = new Array();
		this.wheelCoordinates = new Array();
		//Test data... (uses percentages of width and height format = Q1x, Q1y, Q2x, Q2y...)
		this.wheelCoordinates = [85, 15, 85, 85, 15, 85, 15, 15];
		
		//Draw Wheel Map on top face and wheel locations...
		this.drawTopFaceWheelMap();
		
		//Canvas full size weight distributions
		
		this.topFaceWeightDistCanvas = document.createElement('Canvas');
		this.topFaceWeightDistCanvas.id = this.objectsID+'WeightDistributionCanvas'
		this.topFaceWeightDistCanvas.height = parseInt(this.topFaceContainer.style.height);
		this.topFaceWeightDistCanvas.width = parseInt(this.topFaceContainer.style.width);
		
		//Append element, get context and set position...
		document.getElementById(this.topFaceContainer.id).appendChild(this.topFaceWeightDistCanvas);
		this.topFaceWeightDistContext = this.topFaceWeightDistCanvas.getContext('2d');
		this.topFaceWeightDistCanvas.style.position = 'absolute';
		this.topFaceWeightDistCanvas.style.left = '0px';
		this.topFaceWeightDistCanvas.style.top = '0px';

		
		//Draw weight distributions
		this.drawTopFaceWeightDist();
		
		//** TO DO **//
		//Click anywhere on top surface to bring up dialog with on/off switches for each data overlay and a more info button/view...
			
	}
	
	function isRotationEnabled(onMouseDrag, onSliderBar) {
		if(typeof onMouseDrag == 'boolean') {
			this.rotationOnMouseDrag = onMouseDrag;
		} else {
			console.log('Error! non boolean value passed to \'isRotationEnabled()\'');
		}
		if(typeof onSliderBar == 'boolean') {
			if(onSliderBar) {
				this.rotationOnSliderBar = true;
				//Set slider bar to visibility = visible;
			} else{
				this.rotationOnSliderBar = false;
				//Set slider bar to visibility = gone;
			}
		}else {
			console.log('Error! non boolean value passed to \'isRotationEnabled()\'');
		}
	}
	
	
	
	function isEpsilonBallVisible(isVisible) {
		if(typeof isVisible == 'boolean') {
			this.isEpsilonBallVisible = isVisible;
			this.drawEpsilonBall();
		} else {
			console.log('Error! non boolean value passed to \'isEpsilonBallVisible()\'');
		}
	}
	
	function drawEpsilonBall() {
		//Draw Ball
	}
	
	function drawTopFaceGrid() {
		if(this.isTopGridVisible) {
		//Set some values (make setters for this at some point)
		this.topFaceGridYMinor = this.topFaceGridCanvas.width/30;
		this.topFaceGridXMinor = this.topFaceGridCanvas.height/30;
		this.topFaceGridLineWidth = 1;
		this.topFaceGridContext.strokeStyle = '#AAA';
		
		//Draw vert lines
		this.topFaceGridContext.beginPath();
		this.topFaceGridContext.moveTo(0, 0);
		for(i=0; i<=(this.topFaceGridCanvas.width/this.topFaceGridYMinor); i++) {
			this.topFaceGridContext.lineTo(i*this.topFaceGridYMinor, this.topFaceGridCanvas.height);
			this.topFaceGridContext.moveTo((i+1)*this.topFaceGridYMinor, 0);
		}
		this.topFaceGridContext.moveTo(0,0);
		//Draw horz lines
		for(i=0; i<=(this.topFaceGridCanvas.height/this.topFaceGridXMinor); i++) {
			this.topFaceGridContext.lineTo(this.topFaceGridCanvas.width ,i*this.topFaceGridXMinor);
			this.topFaceGridContext.moveTo(0, (i+1)*this.topFaceGridXMinor);
		}
		this.topFaceGridContext.lineWidth = this.topFaceGridLineWidth;
		this.topFaceGridContext.stroke();
		}
	}
	
	function drawTopFaceWheelMap() {
		//Make setter functions for these...
		this.wheelMapLineColor = '#FF6785';
		this.wheelMapLineWidth = 2;
		this.topFaceWheelMapContext.strokeStyle = this.wheelMapLineColor;
		this.topFaceWheelMapContext.lineWidth = this.wheelMapLineWidth;
		
		//Local Variables used to simplify drawing
		var datum = this.topFaceWheelMapCanvas.width/2;
		var centerOffset = this.topFaceWheelMapCanvas.width*(1/12);
		var vertPadding = this.topFaceWheelMapCanvas.height*(1/18);
		var vertIteration = (this.topFaceWheelMapCanvas.height/this.leftWheelDataFirst.legnth); //Make sure all arrays are the same length before drawing
		
		if(this.isWheelMappingVisible) {
		//Check for first pass data
		if(this.leftWheelDataFirst.length>0 && this.rightWheelDataFirst.length>0) {
		
			this.topFaceWheelMapContext.beginPath();
			//draw left wheel data (first pass)
			this.topFaceWheelMapContext.moveTo(datum-centerOffset, vertPadding);
			for(i=0; i<leftWheelDataFirst.length; i++) {
				this.topFaceWheelMapContext.lineTo(datum-centerOffset-this.leftWheelDataFirst[i], vertIteration*i+vertPadding);
			}
			//draw right wheel data (first pass)
			this.topFaceWheelMapContext.moveTo(datum+centerOffset, vertPadding);
			for(i=0; i<=this.rightWheelDataFirst.length; i++) {
				this.topFaceWheelMapContext.lineTo(datum+centerOffset+this.rightWheelDataFirst[i], vertIteration*i+vertPadding);
			}
			this.topFaceWheelMapContext.stroke();
			
			//Check for Second Pass Data (?change stroke color?)
			if(this.leftWheelDataSecond.length>0 && this.rightWheelDataSecond.length>0) {
				
				this.topFaceWheelMapContext.beginPath();
				//draw left wheel data (second pass)
				this.topFaceWheelMapContext.moveTo(datum-centerOffset, this.topFaceWheelMapCanvas.height-vertPadding);
				for(i=0; i<leftWheelData.length; i++) {
					this.topFaceWheelMapContext.lineTo(datum-centerOffset-this.leftWheelData[i], this.topFaceWheelMapCanvas.height-vertIteration*i-vertPadding);
				}
				//draw right wheel data (second pass)
				this.topFaceWheelMapContext.moveTo(datum+centerOffset, this.topFaceWheelMapCanvas.height-vertPadding);
				for(i=0; i<=this.rightWheelData.length; i++) {
					this.topFaceWheelMapContext.lineTo(datum+centerOffset+this.rightWheelData[i], this.topFaceWheelMapCanvas.height-vertIteration*i-vertPadding);
				}
				this.topFaceWheelMapContext.stroke();
			}
		} else {
			//draw straight lines 
			this.topFaceWheelMapContext.beginPath();
			//draw left data
			this.topFaceWheelMapContext.moveTo(datum-centerOffset, vertPadding);
			this.topFaceWheelMapContext.lineTo(datum-centerOffset, this.topFaceWheelMapCanvas.height-vertPadding);
			//draw right line
			this.topFaceWheelMapContext.moveTo(datum+centerOffset, vertPadding);
			this.topFaceWheelMapContext.lineTo(datum+centerOffset, this.topFaceWheelMapCanvas.height-vertPadding);
			//Stroke Lines
			this.topFaceWheelMapContext.stroke();
		}
		}
		
		//Wheel coordinate data
		if(this.isWheelLocationVisible) {
		if(this.wheelCoordinates.length == 8) {
			//draw a circle at each location
			for(i=0; i<this.wheelCoordinates.length; i+=2){
				this.topFaceWheelMapContext.beginPath();
				this.topFaceWheelMapContext.arc(this.wheelCoordinates[i]/100*this.topFaceWheelMapCanvas.width, this.wheelCoordinates[i+1]/100*this.topFaceWheelMapCanvas.height, parseInt(this.topFaceContainer.style.height)/100, 0, Math.PI*2);
				//If we have globalColors defined use them!
				if(typeof globalColors != 'undefined') {
					if(globalColors.length == 4) {
						this.topFaceWheelMapContext.strokeStyle = globalColors[i/2];
					}
				}
				this.topFaceWheelMapContext.lineWidth = parseInt(this.topFaceContainer.style.height)/200;
				this.topFaceWheelMapContext.stroke();
			}
			
		}
		}
		
	}
	
	function drawTopFaceWeightDist() {
		//** TO DO **// 
		//Make Gradients go edge to edge and make weight lines for actual value
		
		//Draw a gradient rectangle of desired locationa then black line at actual location
		if(this.isWeightDistVisible && this.wheelCoordinates.length == 8) {
			
			//Create left to right optimal gradient
			var grdLR = this.topFaceWeightDistContext.createLinearGradient(this.wheelCoordinates[6]/100*this.topFaceWeightDistCanvas.width, this.wheelCoordinates[7]/100*this.topFaceWeightDistCanvas.height,this.wheelCoordinates[0]/100*this.topFaceWeightDistCanvas.width, this.wheelCoordinates[1]/100*this.topFaceWeightDistCanvas.height);
			grdLR.addColorStop(.30,'rgba(220, 000, 000, 0)');
			grdLR.addColorStop(.4,'rgba(220, 000, 000, 0.2)');
			grdLR.addColorStop(.42, 'rgba(220, 220, 000, 0.2)');
			grdLR.addColorStop(.5, 'rgba(000, 220, 000, .3)');
			grdLR.addColorStop(.58, 'rgba(220, 220, 000, 0.2)');
			grdLR.addColorStop(.6,'rgba(220, 000, 000, 0.2)');
			grdLR.addColorStop(.70,'rgba(220, 000, 000, 0)');

			this.topFaceWeightDistContext.beginPath();
			//Start at Q1
			this.topFaceWeightDistContext.moveTo(this.wheelCoordinates[6]/100*this.topFaceWeightDistCanvas.width, this.wheelCoordinates[7]/100*this.topFaceWeightDistCanvas.height);
			for(i=0; i<this.wheelCoordinates.length; i+=2){
				this.topFaceWeightDistContext.lineTo(this.wheelCoordinates[i]/100*this.topFaceWeightDistCanvas.width,this.wheelCoordinates[i+1]/100*this.topFaceWeightDistCanvas.height);
			}
			this.topFaceWeightDistContext.fillStyle = grdLR;
			this.topFaceWeightDistContext.fill();
			
			//Create front to back optimal gradient		
			var grdFB = this.topFaceWeightDistContext.createLinearGradient(this.wheelCoordinates[6]/100*this.topFaceWeightDistCanvas.width, this.wheelCoordinates[7]/100*this.topFaceWeightDistCanvas.height,this.wheelCoordinates[4]/100*this.topFaceWeightDistCanvas.width, this.wheelCoordinates[5]/100*this.topFaceWeightDistCanvas.height);
			grdFB.addColorStop(.52,'rgba(220, 000, 000, 0)');
			grdFB.addColorStop(.55,'rgba(220, 000, 000, 0.2)');
			grdFB.addColorStop(.57, 'rgba(220, 220, 000, 0.2)');
			grdFB.addColorStop(.65, 'rgba(000, 220, 000, .3)');
			grdFB.addColorStop(.73, 'rgba(220, 220, 000, 0.2)');
			grdFB.addColorStop(.75,'rgba(220, 000, 000, 0.2)');
			grdFB.addColorStop(.78,'rgba(220, 000, 000, 0)');
						
			this.topFaceWeightDistContext.fillStyle = grdFB;
			this.topFaceWeightDistContext.fill();
			
			
			//Draw weight dist lines (temp only)
			this.topFaceWeightDistContext.beginPath();
			this.topFaceWeightDistContext.moveTo(0,this.topFaceWeightDistCanvas.height*.59);
			this.topFaceWeightDistContext.lineTo(this.topFaceWeightDistCanvas.width, this.topFaceWeightDistCanvas.height*.59);
			this.topFaceWeightDistContext.moveTo(this.topFaceWeightDistCanvas.width*.50, 0);			this.topFaceWeightDistContext.lineTo(this.topFaceWeightDistCanvas.width*.50, this.topFaceWeightDistCanvas.height);
			this.topFaceWeightDistContext.stroke();
						
		}
	}

}
/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/

function setXYZ(zRot) {
	if(myScaleObject.isPerspectiveCapable) {
		var xRot = 75;
	    var yRot = 0;
	    if(!zRot) {
	    	zRot = mySliderBar.currentValue+145;
	    }
	    var tString='rotateX('+xRot+'deg) rotateY('+yRot+'deg) rotateZ('+zRot+'deg)';
	    document.getElementById('myScaleObjectContainer').style.webkitTransform=tString;
	    document.getElementById('myScaleObjectContainer').style.MozTransform=tString;
	    document.getElementById('myScaleObjectContainer').style.msTransform=tString;
	    document.getElementById('myScaleObjectContainer').style.OTransform=tString;


	    updateScaleView(xRot, yRot, zRot);
	}
}

function updateScaleView(xRot, yRot, zRot) {
	if(myScaleObject.isPerspectiveCapable) {
		if(typeof myScaleObject.radialArray != 'undefined') {
	    	for(i=0; i<myScaleObject.radialArray.length; i++) {
	    		switch(i) {
					case 0:
						//Quad 1
						myScaleObject.radialArray[i].element.style.webkitTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(3/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.MozTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(3/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.msTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(3/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.OTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(3/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						break;
					case 1:
						//Quad 2
						myScaleObject.radialArray[i].element.style.webkitTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(5/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';	
						myScaleObject.radialArray[i].element.style.MozTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(5/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';	
						myScaleObject.radialArray[i].element.style.msTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(5/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';	
						myScaleObject.radialArray[i].element.style.OTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(5/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2+parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';	
						break;
					case 2:
						//Quad 3
						myScaleObject.radialArray[i].element.style.webkitTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(7/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.MozTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(7/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.msTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(7/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.OTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(7/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY('+parseInt(myScaleObject.containerHeight)*1.05+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';

						break;
					case 3:
						//Quad 4
						myScaleObject.radialArray[i].element.style.webkitTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(1/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.MozTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(1/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.msTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(1/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						myScaleObject.radialArray[i].element.style.OTransform = 'translateZ('+(1*radHeight*Math.sin(zRot*(Math.PI/180)+Math.PI*(1/4)))+'px) translateX('+(parseInt(myScaleObject.containerWidth)/2-parseInt(myScaleObject.topFaceContainer.style.width)*.8)+'px) translateY(-'+(parseInt(myScaleObject.containerHeight)/10)+'px) rotateZ('+(-zRot)+'deg) rotateY('+(-yRot)+'deg) rotateX('+(-xRot)+'deg)';
						break;
				}
	    	}
	    }
	}
}

function tiltScale(angle) {
	if(myScaleObject.isPerspectiveCapable) {
		var tilt = angle;
		document.getElementById('myScaleObjectTopFaceContainer').style.webkitTransformOrigin = '50% 100%';
		document.getElementById('myScaleObjectTopFaceContainer').style.MozTransformOrigin = '50% 100%';
		document.getElementById('myScaleObjectTopFaceContainer').style.msTransformOrigin = '50% 100%';
		document.getElementById('myScaleObjectTopFaceContainer').style.OTransformOrigin = '50% 100%';
	    document.getElementById('myScaleObjectTopFaceContainer').style.webkitTransform = 'rotateX(-'+tilt+'deg)'; 
	    document.getElementById('myScaleObjectTopFaceContainer').style.MozTransform = 'rotateX(-'+tilt+'deg)'; 
	    document.getElementById('myScaleObjectTopFaceContainer').style.msTransform = 'rotateX(-'+tilt+'deg)'; 
		document.getElementById('myScaleObjectTopFaceContainer').style.OTransform = 'rotateX(-'+tilt+'deg)'; 
	     
	    
	    document.getElementById('myScaleObjectLeftArmCanvas').style.webkitTransformOrigin = '50% 100%'; 
	    document.getElementById('myScaleObjectLeftArmCanvas').style.MozTransformOrigin = '50% 100%';
	    document.getElementById('myScaleObjectLeftArmCanvas').style.msTransformOrigin = '50% 100%'; 
	    document.getElementById('myScaleObjectLeftArmCanvas').style.OTransformOrigin = '50% 100%'; 
	    document.getElementById('myScaleObjectLeftArmCanvas').style.webkitTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	    document.getElementById('myScaleObjectLeftArmCanvas').style.MozTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	    document.getElementById('myScaleObjectLeftArmCanvas').style.msTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	    document.getElementById('myScaleObjectLeftArmCanvas').style.OTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 

	    document.getElementById('myScaleObjectRightArmCanvas').style.webkitTransformOrigin = '50% 100%';
	    document.getElementById('myScaleObjectRightArmCanvas').style.MozTransformOrigin = '50% 100%';  
	    document.getElementById('myScaleObjectRightArmCanvas').style.msTransformOrigin = '50% 100%';  
	    document.getElementById('myScaleObjectRightArmCanvas').style.OTransformOrigin = '50% 100%';  
	    document.getElementById('myScaleObjectRightArmCanvas').style.webkitTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	    document.getElementById('myScaleObjectRightArmCanvas').style.MozTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	    document.getElementById('myScaleObjectRightArmCanvas').style.msTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	    document.getElementById('myScaleObjectRightArmCanvas').style.OTransform = 'rotateX(-'+tilt+'deg) rotateY(90deg) translateX(-'+(armWidth/2)+'px)'; 
	}    
}

function handleMouseOverScaleContainer(ctx) {
	//console.log('mouse over '+ctx.id);
}

function handleMouseOutScaleContainer(ctx) {
	//console.log('mouse out '+ctx.id);
}

function handleMouseDownScaleTopFace(ctx) {
	
}


function resizeEnd() {
    if (new Date() - rtime < delta) {
        setTimeout(resizeEnd, delta);
    } else {
        timeout = false;
        console.log('Window Resize Event Ended');
       // document.body.innerHTML = '';

       if(typeof myScaleObject.belongsTo != 'undefined') {
       		var tempParentElement = myScaleObject.belongsTo;
   		}

   		document.getElementById(myScaleObject.viewContainer.id).parentNode.removeChild(document.getElementById(myScaleObject.viewContainer.id));


        myScaleObject = new my3DScaleObject();

        
        if(typeof tempParentElement != 'undefined') { 
        	myScaleObject.isChildOf(tempParentElement);
        }

		myScaleObject.initialize('myScaleObject', window.innerWidth/4);

		document.getElementById('mainVisualHolder').style.height = window.innerWidth/3.75*1.4+'px';
		document.getElementById('scaleVisualSpan').style.lineHeight = window.innerWidth/3.75*1.4+'px';

		radHeight = window.innerWidth/25;

		addRadialToScaleObject(myScaleObject);
    }  
    mySliderBar.updateValuesWithoutContext();
}  
/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/


/***********************************/
//Radial Value Object 
/***********************************/

function radialValueObject() {
	//Core Functions
	this.initialize = initialize; 	//Initializes a very basic radial
	this.appendTo = appendTo;		//Appends the object to an element(ex: a div tag)
	this.redraw = redraw;			//Call this after a set of changes to update the object
	this.setProgress = setProgress;	//Set the progress of the radial (default 0-100)
	this.setPosition = setPosition;	//Set the absolute position of the center of the object
	this.setArrayData = setArrayData;	//Provide an array of data for the object to plot
	this.setRedrawMethod = setRedrawMethod;	//Currently only supports onMouseClick
	this.setMinMaxValue = setMinMaxValue;	//Overrides the defualt min and max values
	
	//Visual
	this.setDiameter = setDiameter;
	this.setLineWidth = setLineWidth;
	this.setLineColor = setLineColor;
	this.setHasRadialBackground = setHasRadialBackground;
	this.setIsBubbled = setIsBubbled;
	this.setHasContainer = setHasContainer;	
	
	//Inner Text
	this.setProgressText = setProgressText;
	this.setTextColor = setTextColor;
	this.setUnitSymbol = setUnitSymbol;
	
	
	function appendTo(htmlElementID) {
	if(document.getElementById(htmlElementID)) {
		this.belongsTo = htmlElementID;
		if(typeof(this.element) != 'undefined') {
			//Override potential absolute positioning
			this.element.style.position = 'inline-block';
			console.log('here');
			var tempElement = document.getElementById(this.belongsTo);
			tempElement.appendChild(this.element);	
		}		
	}else {
		this.belongsTo = null;
	}
	}
	function setDiameter(diameterInPx) {
		this.diameter = diameterInPx;
	}
	function setLineWidth(lineWidthInPx) {
		this.lineWidth = lineWidthInPx;
	}
	function setLineColor(lineColor) {
		this.lineColor = lineColor;
	}
	function setPosition(x,y) {
		if(x || y) {
			this.xPos = 0;
			this.yPos = 0;
			if(x) this.xPos = x;
			if(y) this.yPos = y;
			this.element.style.position = 'absolute';
		} else {
			this.element.style.position = 'inline-block';
		}
	}
	function setMinMaxValue(minValue, maxValue) {
		this.minValue = minValue;
		this.maxValue = maxValue;
	}
	function setProgressText(setCanvasFont) {
		this.progressText = setCanvasFont;
	}
	function setTextColor(color) {
		this.textColor = color;
	}
	function setIsBubbled(isBubbled) {
		this.isBubbled = isBubbled;
	}
	function setProgress(progress) {
		this.progress = progress;
	}
	function getProgress() {
		return this.progress;
	}
	function redraw() {
		redrawElement(this);	
	}
	function setHasContainer(hasContainer,type_0light_1dark) {
		this.hasContainer = hasContainer;
		//TYPE 0 = light, 1 = dark
		this.containerType = type_0light_1dark;
	}
	function setHasRadialBackground(hasRadialBackground, color) {
		this.hasRadialBackground = hasRadialBackground;
		this.radialBackgroundColor = color;
	}
	function setUnitSymbol(unitSymbol, font, color) {
		this.unitSymbol = unitSymbol;
		if(font) this.unitSymbolFont = font;
		if(color) this.unitSymbolColor = color;	
	}
	function setArrayData(dataArray, interval, totalDuration, timeArray) {
		if(dataArray.length > 1) {
			this.dataArray = new Array();
			this.dataArray = dataArray;
		} else {
			console.log('Error setting data array to radial, data array has to be an array with length greater than 1');
		}
		if(interval) {
			this.interval = interval;
			this.totalDuration = null;
			this.timeArray = null;
		}else if(totalDuration) {
			this.totalDuration = totalDuration;
			this.interval = null;
			this.timeArray = null;
		}else if(timeArray.length == dataArray.length) {
			this.timeArray = new Array();
			this.timeArray = timeArray;
			this.myTimeouts = new Array();
			this.interval = null;
			this.totalDuration = null;
		} else {
			console.log('setArrayData Failed! No valid time information found');
			this.timeArray = null;
			this.interval = null;
			this.totalDuration = null;
			this.dataArray = null;
		}
	}
	
	function setRedrawMethod(redrawOnMouseClick) {
		this.redrawOnMouseClick = redrawOnMouseClick;
	}
	
	
	function initialize(elementsId) {
		//Define a global array as a radial object context holder (used for accessing context of a radial when clicked - for redrawing purposes);
		if(typeof radCntxArry == 'undefined') {
			radCntxArry = new Array(); //tried to use an obscure variable name as to not rewrite any already defined gloabl variables;
		}
		this.element = document.createElement('canvas');
		this.element.id = elementsId;
		radCntxArry[elementsId] = this;
		this.element.className = 'radialValueObject';
		this.element.onclick = function() {handleRadialClicked(this);};
		if(this.belongsTo != null) {
			var tempElement = document.getElementById(this.belongsTo);
			tempElement.appendChild(this.element);
		} else {
			document.body.appendChild(this.element);
		}
		this.context = this.element.getContext('2d');
		//this.element.style.position = 'absolute';
		this.diameter = 100;
		this.minValue = 0;
		this.maxValue = 100;
		this.lineWidth = 1;
		this.lineColor = '#000';
		this.context.canvas.width = this.diameter+this.lineWidth*2;
		this.context.canvas.height = this.diameter+this.lineWidth*2;
		this.xPos = this.context.canvas.width/2;
		this.yPos = this.context.canvas.height/2;
		this.showProgressText = true;
		this.isBubbled = false;
		this.context.fillStyle = this.lineColor;
		this.context.fillRect(0,0,this.context.canvas.width, this.context.canvas.height);
		this.setProgress(0);
		this.redraw();
		console.log(this.element);
	}
	function redrawElement(e) {
		//console.log(e.context);
		e.context.clearRect(0,0,e.context.canvas.width, e.context.canvas.height);
		e.context.lineWidth = e.lineWidth;
		e.context.canvas.width = e.diameter+e.lineWidth*2;
		e.context.canvas.height = e.diameter+e.lineWidth*2;
		e.element.style.top = (e.yPos - e.diameter/2) + 'px';
		e.element.style.left = (e.xPos - e.diameter/2) + 'px';
		e.context.strokeStyle = e.lineColor;
		drawRadialWithContext(e);
	}
	function drawRadialWithContext(e) {
		//Clear Canvas 
		e.context.clearRect(0,0,e.context.canvas.width,e.context.canvas.height);
		
		// Draw Container
		if(e.hasContainer) {
			e.context.canvas.width = e.diameter+e.lineWidth*5;
			e.context.canvas.height = e.diameter+e.lineWidth*5;
			
			//Draw outer container
			e.context.beginPath();
			e.context.arc(e.context.canvas.width/2, e.context.canvas.height/2, e.diameter/2+e.lineWidth*1.25, 0, Math.PI*2);
			var grd = e.context.createRadialGradient(e.context.canvas.width/2,e.context.canvas.height/2,e.diameter/2+e.lineWidth/2,e.context.canvas.width/2,e.context.canvas.height/2,e.diameter/2+e.lineWidth*2);
			if(e.containerType == 0) {
				grd.addColorStop(0,'#999');
				grd.addColorStop(.2, '#f7f7f6');
				grd.addColorStop(.5,'white');
				grd.addColorStop(.8,'#f7f7f6');
				grd.addColorStop(1,'#999');
			} else {
				grd.addColorStop(0,'#000');
				grd.addColorStop(.05, '#373736');
				grd.addColorStop(.5,'#646464');
				grd.addColorStop(.95,'#373736');
				grd.addColorStop(1,'#fff');
			}
			e.context.strokeStyle = grd;
			e.context.lineWidth = e.lineWidth*1.5;
			e.context.stroke();
			
			//Draw inner container
			e.context.beginPath();
			e.context.arc(e.context.canvas.width/2, e.context.canvas.height/2, e.diameter/2-e.lineWidth/2, 0, Math.PI*2);
			var grd = e.context.createRadialGradient(e.context.canvas.width/2,e.context.canvas.height/2,e.diameter/2-e.lineWidth,e.context.canvas.width/2,e.context.canvas.height/2,e.diameter/2);
			if(e.containerType == 0){			
				grd.addColorStop(0,'#f7f7f6');
				grd.addColorStop(1,'#777');
			} else {
				grd.addColorStop(0,'#373736');
				grd.addColorStop(1,'#dadada');
			}
			e.context.fillStyle = grd;
			e.context.fill();
		
		}
		
		//Draw radial background
		if(e.hasRadialBackground) {
			e.context.beginPath();
			e.context.arc(e.context.canvas.width/2, e.context.canvas.height/2, e.diameter/2, 0, Math.PI*2);
			if(e.radialBackgroundColor) {
				e.context.strokeStyle = e.radialBackgroundColor;
			}
			e.context.lineWidth = e.lineWidth;
			e.context.stroke();
		}
		
		//Draw progress text
		if(e.progressText) {
			e.context.textAlign = 'center';
			e.context.fillStyle = e.textColor;
			e.context.font = e.progressText;
			e.context.fillText(Math.round(e.progress).toString(), e.context.canvas.width/2, e.context.canvas.height/2+parseInt(e.context.font)/3);
			if(e.unitSymbol) {
				var xTempPos = (e.context.canvas.width+e.context.measureText(Math.round(e.progress)).width)/2;
				var yTempPos = e.context.canvas.height/2 + parseInt(e.progressText)/6;
				e.context.font = e.unitSymbolFont;
				e.context.fillStyle = e.unitSymbolColor;
				e.context.fillText(e.unitSymbol, xTempPos+e.context.measureText(e.unitSymbol).width/2, yTempPos+parseInt(e.context.font)/3);
			}
		}
		
		//Draw circular path
		if(e.progress >= e.maxValue) {
			e.progress = 1.5*Math.PI + 2*Math.PI;
		}else if (e.progress < e.minValue) {
			e.progress = e.minValue;
		}else if(e.progress <= .25*e.maxValue) {
			e.progress = 1.5*Math.PI + (e.progress/(.25*e.maxValue))*0.5*Math.PI;
		} else {
			e.progress = ((e.progress-(e.maxValue*.25))/(.75*e.maxValue))*Math.PI*1.5;
		}
		e.context.beginPath();
		e.context.arc(e.context.canvas.width/2, e.context.canvas.height/2, e.diameter/2, 1.5*Math.PI, e.progress, false);
		e.context.lineWidth = e.lineWidth;
		e.context.strokeStyle = e.lineColor;
		e.context.stroke();
		if(e.isBubbled) {
			e.context.beginPath();
			e.context.arc(e.context.canvas.width/2+Math.cos(e.progress)*e.diameter/2, e.context.canvas.height/2+Math.sin(e.progress)*e.diameter/2, e.lineWidth/2, 0, Math.PI*2);
			e.context.arc(e.context.canvas.width/2, e.context.canvas.height/2-e.diameter/2, e.lineWidth/2, 0, Math.PI*2);
			e.context.fillStyle = e.lineColor;
			e.context.fill();
		}
	}
}

function handleAutomatedRedraw(e, realTime) {
	if(realTime) {
		e.setProgress(e.dataArray[e.counterIndex]);
		e.redraw();
		console.log('realTime timeout called');
	}else{
		if(e.counterIndex < e.dataArray.length) {
			e.setProgress(e.dataArray[e.counterIndex]);
			e.redraw();
			console.log('interval/totalDuration fired');
		}else{
			clearInterval(e.autoGeneratedInterval);
			console.log('cleared autoGeneratedInterval');
		}
	}		
	e.counterIndex++;
}

function handleRadialClicked(elem) {
	console.log(elem+' was clicked');
	//Check to see if the element has a redraw method attached to it...
	var ctx = radCntxArry[elem.id];
	handleQuadRadClicked(ctx);
	if(ctx.redrawOnMouseClick) {
	console.log(radCntxArry[elem.id].element.id+' was clicked');
	ctx.counterIndex = 0;
	clearInterval(ctx.autoGeneratedInterval);
	
		if(ctx.totalDuration) {
			console.log('initiated duration based redraw on element:'+ctx.element.id);
			if( ctx.totalDuration/ctx.dataArray.length < 10) {
				ctx.autoGeneratedInterval = setInterval(function() {handleAutomatedRedraw(ctx, null)},10);
				} else {
					ctx.autoGeneratedInterval = setInterval(function() {handleAutomatedRedraw(ctx, null)}, ctx.totalDuration/ctx.dataArray.length);
				}
		} else if(ctx.interval) {
		console.log('initiated interval based redraw on element: '+ctx.element.id);
		ctx.autoGeneratedInterval = setInterval(function() {handleAutomatedRedraw(ctx, null)}, ctx.interval);
		} else if(ctx.timeArray) {
			if((ctx.timeArray.length == ctx.dataArray.length) && ctx.dataArray.length > 1) {
				var totalTime = 0;
				//Clear all previously set 'setTimeouts' (used for repeat clicking)
				while(ctx.myTimeouts.length >= 1) {
					clearTimeout(ctx.myTimeouts[0]);
					ctx.myTimeouts.shift();
				}
				//Set a timeout for each datapoint base on the real time data
				for(i=0; i<ctx.timeArray.length; i++) {
					totalTime = ctx.timeArray[i]-ctx.timeArray[0];
					ctx.myTimeouts[i] = setTimeout(function() {handleAutomatedRedraw(ctx, true)}, totalTime);
				}
			}
		} 
	}
}

/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/



/******************************/
//Weight Distro Graphic Objects
/******************************/
function weightAnalysisGraphicObject() {
	this.debug = true;

	//Properties
	this.isViewFacingFront = false;
	this.actualTiltAngleLeft = 0;
	this.minTiltAngleLeft = 0;
	this.actualTiltAngleRight = 0;
	this.minTiltAngleRight = 0;
	this.actualTiltAngleBack = 0;
	this.minTiltAngleBack = 0;
	this.actualTiltAngleFront = 0;
	this.minTiltAngleFront = 0;
	this.isDepictingMaxTilt = false;
	this.actualFrontBackDistribution = 0;
	this.optimalFrontBackDistributionWidth = 0;
	this.actualLeftRightDistribution = 0;
	this.optimalLeftRightDistributionWidth = 0;
	this.isDepictingWeightDistribution = false;

	this.belongsTo = null;
	this.overallScale = 0;

	this.dim_wheelRadiusMain = 0;
	this.dim_wheelRadiusCastors = 0;
	this.dim_wheelBaseLength = 0;
	this.dim_wheelBaseWidth = 0;
	this.dim_seatHeight = 0;
	this.dim_backRestHeight = 0;
	this.dim_objectHeight = 0;
	this.dim_frontAxelWidth = 0;
	this.dim_frontAxelHeight = 5;
	this.dim_frontWheelWidth = 10;
	this.dim_frontCastorWidth = 0;
	this.dim_pushRimsRadius = 0;
	this.dim_pushRimWidth = 0;
	this.dim_footRestsWidth = 0;
	this.dim_footRestsHeight = 0;

	this.dim_distArrowWidth = 20;
	this.dim_distArrowHeight = 10;
	this.dim_distLineArrowWidth = 20;
	this.dim_distLineArrowHeight = 7;

	this.color_wheelRubber = '#000';
	this.color_seat = '#000';
	this.color_frame = '#a6a6a6';
	this.color_spokes = '#000';
	this.color_castorSpokes = '#737373';
	this.color_handleGrips = '#000';
	this.color_innerRim = '#000';
	this.color_armRests = '#000';
	this.color_weightDistributionArrows = '#000';
	this.color_angleArrows = '#000';
	this.color_optimalWeightZone = '#000';
	this.color_decentWeightZone = '#000';
	this.color_warningWeightZone = '#000';
	this.color_cogPointer = '#000';
	this.color_cogLine = '#000';
	this.color_weightDistributionPointer = '#000';
	this.color_weightDistributionLine = '#000';
	this.color_tiltAreaBorder = '#000';
	this.color_footRests = '#555';
	this.color_seatCusion = '#222';

	this.color_distArrow = '#b4dd77';
	this.color_distArrowMedium = '#ffcc00';
	this.color_distArrowBad = '#ff6677'; 

	this.color_distLineArrow = 'red';

	this.style_distFont = '20px Lucida Grande';

	//Optimal Front (or Left) Distribution
	this.optimumDistZoneFrontToBack = .35;
	this.optimumDistZoneLeftToRight = .5;
	this.maxOkayDistributionErrorFrontToBack = .09;
	this.maxOkayDistributionErrorLeftToRight = .05;
	this.mediumOkayDistributionFactor = 1.3;

	this.warningAreaDegreesBack = 8;
	this.okayAreaDegreesBack = 4;
	this.warningAreaDegreesSide = 4;
	this.okayAreaDegreesSide = 2;

	//functions
	this.drawWheelchairTilted = drawWheelchairTilted;
	this.drawWheelchairDistribution = drawWheelchairDistribution;
	this.updateDistributionValues = updateDistributionValues;
	this.updateCogValues = updateCogValues;

	function updateDistributionValues(frontOrLeftDistribution, totalWeight, isMetric) {
		if(frontOrLeftDistribution < 0 || frontOrLeftDistribution > 100) {
			console.log('invalid weight distribution!');
		} else {
			if(frontOrLeftDistribution > 1 && frontOrLeftDistribution < 100) {
				frontOrLeftDistribution /= 100;
			}
			var color = '';
			if(this.isViewFacingFront) {
				if(frontOrLeftDistribution > this.optimumDistZoneLeftToRight-this.maxOkayDistributionErrorLeftToRight/this.mediumOkayDistributionFactor && frontOrLeftDistribution < this.optimumDistZoneLeftToRight+this.maxOkayDistributionErrorLeftToRight/this.mediumOkayDistributionFactor) {
					color = this.color_distArrow;
				} else if(frontOrLeftDistribution > this.optimumDistZoneLeftToRight-this.maxOkayDistributionErrorLeftToRight*this.mediumOkayDistributionFactor && frontOrLeftDistribution < this.optimumDistZoneLeftToRight+this.maxOkayDistributionErrorLeftToRight*this.mediumOkayDistributionFactor) {
					color = this.color_distArrowMedium;
				} else {
					color = this.color_distArrowBad;
				}
			} else {
				if(frontOrLeftDistribution > this.optimumDistZoneFrontToBack-this.maxOkayDistributionErrorFrontToBack/this.mediumOkayDistributionFactor && frontOrLeftDistribution < this.optimumDistZoneFrontToBack+this.maxOkayDistributionErrorFrontToBack/this.mediumOkayDistributionFactor) {
					color = this.color_distArrow;
				} else if(frontOrLeftDistribution > this.optimumDistZoneFrontToBack-this.maxOkayDistributionErrorFrontToBack*this.mediumOkayDistributionFactor && frontOrLeftDistribution < this.optimumDistZoneFrontToBack+this.maxOkayDistributionErrorFrontToBack*this.mediumOkayDistributionFactor) {
					color = this.color_distArrowMedium;
				} else {
					color = this.color_distArrowBad;
				}
			}

			if(document.getElementById(this.objId+'LeftDistributionArrow')) {
				this.leftDist.style.webkitTransition = 'border-bottom 1s';
				this.leftDist.style.MozTransition = 'border-bottom 1s';
				this.leftDist.style.msTransition = 'border-bottom 1s';
				this.leftDist.style.OTransition = 'border-bottom 1s';

				this.leftDist.style.borderBottom = this.dim_distArrowHeight+'px solid '+color;
			}
			if(document.getElementById(this.objId+'RightDistributionArrow')) {
				this.rightDist.style.webkitTransition = 'border-bottom 1s';
				this.rightDist.style.MozTransition = 'border-bottom 1s';
				this.rightDist.style.msTransition = 'border-bottom 1s';
				this.rightDist.style.OTransition = 'border-bottom 1s';

				this.rightDist.style.borderBottom = this.dim_distArrowHeight+'px solid '+color;
			}
			if(document.getElementById(this.objId+'LeftDistributionArrowText')) {
				this.leftDistText.style.webkitTransition = 'border 1s';
				this.leftDistText.style.MozTransition = 'border 1s';
				this.leftDistText.style.msTransition = 'border 1s';
				this.leftDistText.style.OTransition = 'border 1s';
				if(totalWeight && isMetric) this.leftDistText.innerHTML = (totalWeight*frontOrLeftDistribution).toFixed(1)+'kg';
				else if(totalWeight) this.leftDistText.innerHTML = (totalWeight*frontOrLeftDistribution).toFixed(1)+'lb';	
				else this.leftDistText.innerHTML = (frontOrLeftDistribution*100).toFixed(1)+'%';
				this.leftDistText.style.border = '2px solid '+color;
				this.leftDistText.style.borderBottom = 'none';
			}
			if(document.getElementById(this.objId+'RightDistributionArrowText')) {
				this.rightDistText.style.webkitTransition = 'border 1s';
				this.rightDistText.style.MozTransition = 'border 1s';
				this.rightDistText.style.msTransition = 'border 1s';
				this.rightDistText.style.OTransition = 'border 1s';
				if(totalWeight && isMetric) this.rightDistText.innerHTML = (totalWeight*(1-frontOrLeftDistribution)).toFixed(1)+'kg';
				else if(totalWeight) this.rightDistText.innerHTML = (totalWeight*(1-frontOrLeftDistribution)).toFixed(1)+'lb';	
				else this.rightDistText.innerHTML = ((1-frontOrLeftDistribution)*100).toFixed(1)+'%';
				this.rightDistText.style.border = '2px solid '+color;	
				this.rightDistText.style.borderBottom = 'none';
			}
			if(document.getElementById(this.objId+'WeightDistributionLine')) {
				this.weightDistroLine.style.webkitTransition = 'left 1s';
				this.weightDistroLine.style.MozTransition = 'left 1s';
				this.weightDistroLine.style.msTransition = 'left 1s';
				this.weightDistroLine.style.OTransition = 'left 1s';
				if(this.isViewFacingFront) {
					this.weightDistroLine.style.left = (((this.canvas.width-this.sideWheelOffset*2))*frontOrLeftDistribution)+this.sideWheelOffset+'px';
				} else {
					this.weightDistroLine.style.left = this.sideMainWheelOffset-((this.sideMainWheelOffset-this.sideCasterOffset)*frontOrLeftDistribution)+'px';
				}
			}
			if(document.getElementById(this.objId+'WeightDistributionLine')) {
				this.weightDistroLineArrow.style.webkitTransition = 'left 1s';
				this.weightDistroLineArrow.style.MozTransition = 'left 1s';
				this.weightDistroLineArrow.style.msTransition = 'left 1s';
				this.weightDistroLineArrow.style.OTransition = 'left 1s';
				if(this.isViewFacingFront) {
					this.weightDistroLineArrow.style.left = (((this.canvas.width-this.sideWheelOffset*2))*frontOrLeftDistribution)+this.sideWheelOffset-this.dim_distLineArrowWidth+'px';
				} else {
					this.weightDistroLineArrow.style.left = this.sideMainWheelOffset-((this.sideMainWheelOffset-this.sideCasterOffset)*frontOrLeftDistribution)-this.dim_distLineArrowWidth+'px';
				}
			}
			if(document.getElementById(this.objId+'DistributionLineText')) {
				this.distLineText.style.webkitTransition = 'left 1s';
				this.distLineText.style.MozTransition = 'left 1s';
				this.distLineText.style.msTransition = 'left 1s';
				this.distLineText.style.OTransition = 'left 1s';
				if(this.isViewFacingFront) {
					this.distLineText.style.left = (((this.canvas.width-this.sideWheelOffset*2))*frontOrLeftDistribution)+this.sideWheelOffset-this.dim_distLineArrowWidth*2.5+'px';
				} else {
					this.distLineText.style.left = this.sideMainWheelOffset-((this.sideMainWheelOffset-this.sideCasterOffset)*frontOrLeftDistribution)-this.dim_distLineArrowWidth*2.5+'px';
				}
				this.distLineText.innerHTML = (frontOrLeftDistribution*100).toFixed(0)+' <strong>:</strong> '+((1-frontOrLeftDistribution)*100).toFixed(0);
			}
		}
	}

	function updateCogValues(angle) {
		if(angle <= 0) {
			angle = 0;
			if(this.degub) console.log('Negative Angle Recieved, set angle to 0!');
		} 
		if(angle > 45) {
			angle = 45;
			if(this.debug) console.log('Angle trimmed to 45deg!');
		}
		if(this.cogViewType == 0) angle = -angle*(Math.PI/180);
		if(this.cogViewType == 1) angle = angle*(Math.PI/180);
		if(this.cogViewType == 2) angle = angle*(Math.PI/180);
		
		renderCOGIndicators(this, this.objId, this.cogViewType, angle);
		renderTiltAngleText(this, this.objId, this.cogViewType, angle);
	}

	function drawWheelchairTilted(id, viewType, maxTilt, maxHeight) {
		this.objId = id;
		this.cogViewType = viewType;
		if(viewType == 2) this.isViewFacingFront = false;
		else this.isViewFacingFront = true;
		if(maxHeight > 50) {
			this.dim_objectHeight = maxHeight;
		} else {
			this.dim_objectHeight = 300;
		}
		if(this.isViewFacingFront) {
			renderFrontFacingWheelchair(this, id);
		} else {
			renderSideFacingWheelchair(this, id);
		}
		//Validate maxTilt (expected in degrees)
		if(maxTilt <= 0) {
			maxTilt = 0;
			if(this.degub) console.log('Negative Angle Recieved, set angle to 0!');
		} else {
			if(maxTilt > 45) {
				maxTilt = 45*Math.PI/180;
				if(debug) console.log('Angle trimmed to 45deg!');
			} else {
				if(viewType == 0) maxTilt = -maxTilt*(Math.PI/180);
				if(viewType == 1) maxTilt = maxTilt*(Math.PI/180);
				if(viewType == 2) maxTilt = maxTilt*(Math.PI/180);
			} 
			renderCOGIndicators(this, id, viewType, maxTilt);
		}
		renderTiltAngleText(this, id, viewType, maxTilt);
	}

	function drawWheelchairDistribution(id, isFrontOn, weightRatioFront, maxHeight) {
		this.objId = id;
		if(isFrontOn) {
			this.isViewFacingFront = true;
		}
		if(maxHeight > 50) {
			this.dim_objectHeight = maxHeight;
		} else {
			this.dim_objectHeight = 300;
		}
		if(this.isViewFacingFront) {
			renderFrontFacingWheelchair(this, id);
		} else {
			renderSideFacingWheelchair(this, id);
		}
		if(weightRatioFront > 1 && weightRatioFront < 100) {
			weightRatioFront /= 100;
		} else if(weightRatioFront > 0 && weightRatioFront < 1){
			weightRatioFront = weightRatioFront;
		} else {
			console.log('invalid weight distribution!');
			if(this.isViewFacingFront) weightRatioFront = .5;
			else weightRatioFront = .35;
		}
		renderDistributionIndicators(this, id, weightRatioFront, 1-weightRatioFront);

	}
	function renderCOGIndicators(ctx, id, viewType, angle) {
		if(document.getElementById(id+'WarningTiltArea')) {
			document.getElementById(id+'WarningTiltArea').parentNode.removeChild(document.getElementById(id+'WarningTiltArea'));
			if(ctx.debug) console.log('removed existing WarningTiltArea');
		}
		if(document.getElementById(id+'OkayTiltArea')) {
			document.getElementById(id+'OkayTiltArea').parentNode.removeChild(document.getElementById(id+'OkayTiltArea'));
			if(ctx.debug) console.log('removed existing OkayTiltArea');
		}
		if(document.getElementById(id+'GoodTiltArea')) {
			document.getElementById(id+'GoodTiltArea').parentNode.removeChild(document.getElementById(id+'GoodTiltArea'));
			if(ctx.debug) console.log('removed existing GoodTiltArea');
		}
		if(document.getElementById(id+'CogAngleText')) {
			document.getElementById(id+'CogAngleText').parentNode.removeChild(document.getElementById(id+'CogAngleText'));
			if(ctx.debug) console.log('removed existing CogAngleText');
		}

		if(ctx.debug) console.log('rendering tilt angle triangles');
		var skipNext = false;
		var tempBoundingBox = 0;
		if(viewType == 0) {ctx.canvas.style.webkitTransformOrigin = ctx.sideWheelOffset+'px 100%'; ctx.canvas.style.MozTransformOrigin = ctx.sideWheelOffset+'px 100%'; ctx.canvas.style.msTransformOrigin = ctx.sideWheelOffset+'px 100%'; ctx.canvas.style.OTransformOrigin = ctx.sideWheelOffset+'px 100%';}
		if(viewType == 1) {ctx.canvas.style.webkitTransformOrigin = (ctx.canvas.width-ctx.sideWheelOffset)+'px 100%'; ctx.canvas.style.MozTransformOrigin = (ctx.canvas.width-ctx.sideWheelOffset)+'px 100%'; ctx.canvas.style.msTransformOrigin = (ctx.canvas.width-ctx.sideWheelOffset)+'px 100%'; ctx.canvas.style.OTransformOrigin = (ctx.canvas.width-ctx.sideWheelOffset)+'px 100%';}
		if(viewType == 2) {ctx.canvas.style.webkitTransformOrigin = ctx.sideMainWheelOffset*1.1+'px 100%'; ctx.canvas.style.MozTransformOrigin = ctx.sideMainWheelOffset*1.1+'px 100%'; ctx.canvas.style.msTransformOrigin = ctx.sideMainWheelOffset*1.1+'px 100%'; ctx.canvas.style.OTransformOrigin = ctx.sideMainWheelOffset*1.1+'px 100%';}
		ctx.canvas.style.webkitTransform = ''; //reset any rotations
		ctx.canvas.style.MozTransform = ''; //reset any rotations
		ctx.canvas.style.msTransform = ''; //reset any rotations
		ctx.canvas.style.OTransform = ''; //reset any rotations
		tempBoundingBox = ctx.canvas.getBoundingClientRect();
		console.log(tempBoundingBox.top+';'+tempBoundingBox.right+':'+tempBoundingBox.bottom+';'+tempBoundingBox.left)
		ctx.canvas.style.webkitTransform = 'rotateZ('+angle+'rad)';
		ctx.canvas.style.MozTransform = 'rotateZ('+angle+'rad)';
		ctx.canvas.style.msTransform = 'rotateZ('+angle+'rad)';
		ctx.canvas.style.OTransform = 'rotateZ('+angle+'rad)';

		
		ctx.warningTiltArea = document.createElement('div');
		ctx.warningTiltArea.id = id+'WarningTiltArea';
		ctx.warningTiltArea.className = 'warningTiltArea tiltAreaTriangle';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.warningTiltArea);
		ctx.warningTiltArea.style.position = 'relative';
		ctx.warningTiltArea.style.height = '0px';
		ctx.warningTiltArea.style.width = '0px';
		var tempAngle = 0;
		if(viewType == 0) {
			if(angle*180/Math.PI < -ctx.warningAreaDegreesSide) {
				tempAngle = ctx.warningAreaDegreesSide;
				console.log('tilt angle greater than warning area, angle:'+tempAngle);
			} else {
				tempAngle = Math.abs(angle)*180/Math.PI;
				console.log('tilt angle is less than warning area, angle:'+tempAngle);
				skipNext = true;
			}
			ctx.warningTiltArea.style.borderBottom = ctx.canvas.width*Math.tan(tempAngle*Math.PI/180)+'px solid '+ctx.color_distArrowBad;
			ctx.warningTiltArea.style.borderLeft = ctx.canvas.width+'px solid transparent';
			ctx.warningTiltArea.style.borderRight = '0px solid transparent';
		} else {
			if(viewType == 1) {
				if(angle*180/Math.PI > ctx.warningAreaDegreesSide) {
					tempAngle = ctx.warningAreaDegreesSide;
					console.log('tilt angle greater than warning area, angle:'+tempAngle);
				} else {
					tempAngle = Math.abs(angle)*180/Math.PI;
					console.log('tilt angle is less than warning area, angle:'+tempAngle);
					skipNext = true;
				}
				ctx.warningTiltArea.style.borderBottom = ctx.canvas.width*Math.tan((tempAngle)*Math.PI/180)+'px solid '+ctx.color_distArrowBad;
			}
			if(viewType == 2) {
				if(angle*180/Math.PI > ctx.warningAreaDegreesBack) {
					tempAngle = ctx.warningAreaDegreesBack;
					console.log('tilt angle greater than warning area, angle:'+tempAngle);
				} else {
					tempAngle = Math.abs(angle)*180/Math.PI;
					console.log('tilt angle is less than warning area, angle:'+tempAngle);
					skipNext = true;
				}
				ctx.warningTiltArea.style.borderBottom = ctx.canvas.width*Math.tan((tempAngle)*Math.PI/180)+'px solid '+ctx.color_distArrowBad;
			}
			ctx.warningTiltArea.style.borderLeft = '0px solid transparent';
			ctx.warningTiltArea.style.borderRight = ctx.canvas.width+'px solid transparent';
			ctx.warningTiltArea.style.left = ctx.canvas.height/600+'px';
			if(viewType == 2) ctx.warningTiltArea.style.left = ctx.canvas.height/100+'px';
		}
		if(viewType == 2) ctx.warningTiltArea.style.top = tempBoundingBox.bottom - ctx.warningTiltArea.getBoundingClientRect().bottom+(Math.tan(angle)*(ctx.canvas.width - ctx.sideMainWheelOffset*1.1))+'px';
		else ctx.warningTiltArea.style.top = tempBoundingBox.bottom - ctx.warningTiltArea.getBoundingClientRect().bottom+(Math.tan(Math.abs(angle))*(ctx.sideWheelOffset))+'px';
		
		
		if(!skipNext) {
			ctx.okayTiltArea = document.createElement('div');
			ctx.okayTiltArea.id = id+'OkayTiltArea';
			ctx.okayTiltArea.className = 'okayTiltArea tiltAreaTriangle';
			document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.okayTiltArea);
			ctx.okayTiltArea.style.position = 'relative';
			ctx.okayTiltArea.style.height = '0px';
			ctx.okayTiltArea.style.width = '0px';
			var tempAngle = 0;
			if(viewType == 0) {
				if(angle*180/Math.PI < -(ctx.warningAreaDegreesSide+ctx.okayAreaDegreesSide)) {
					tempAngle = ctx.okayAreaDegreesSide;
					console.log('tilt angle greater than warning area, angle:'+tempAngle);
				} else {
					tempAngle = Math.abs(angle)*180/Math.PI - ctx.warningAreaDegreesSide;
					console.log('tilt angle is less than warning area, angle:'+tempAngle);
					skipNext = true;
				}
				ctx.okayTiltArea.style.borderBottom = ctx.canvas.width*Math.tan(tempAngle*Math.PI/180)+'px solid '+ctx.color_distArrowMedium;
				ctx.okayTiltArea.style.borderLeft = ctx.canvas.width*1.001/Math.cos(ctx.warningAreaDegreesSide*Math.PI/180)+'px solid transparent';
				ctx.okayTiltArea.style.borderRight = '0px solid transparent';
			} else {
				if(viewType == 1) {
					if(angle*180/Math.PI > (ctx.warningAreaDegreesSide+ctx.okayAreaDegreesSide)) {
						tempAngle = ctx.okayAreaDegreesSide;
						console.log('tilt angle greater than warning area, angle:'+tempAngle);
					} else {
						tempAngle = Math.abs(angle)*180/Math.PI - ctx.warningAreaDegreesSide;
						console.log('tilt angle is less than warning area, angle:'+tempAngle);
						skipNext = true;
					}
					ctx.okayTiltArea.style.borderBottom = ctx.canvas.width*Math.tan((tempAngle)*Math.PI/180)+'px solid '+ctx.color_distArrowMedium;
					ctx.okayTiltArea.style.borderRight = ctx.canvas.width*1.001/Math.cos(ctx.warningAreaDegreesSide*Math.PI/180)+'px solid transparent';
				}
				if(viewType == 2) {
					if(angle*180/Math.PI > (ctx.warningAreaDegreesBack+ctx.okayAreaDegreesBack)) {
						tempAngle = ctx.okayAreaDegreesBack;
						console.log('tilt angle greater than warning area, angle:'+tempAngle);
					} else {
						tempAngle = Math.abs(angle)*180/Math.PI - ctx.warningAreaDegreesBack;
						console.log('tilt angle is less than warning area, angle:'+tempAngle);
						skipNext = true;
					}
					ctx.okayTiltArea.style.borderBottom = ctx.canvas.width*Math.tan((tempAngle)*Math.PI/180)+'px solid '+ctx.color_distArrowMedium;
					ctx.okayTiltArea.style.borderRight = ctx.canvas.width*1.001/Math.cos(ctx.warningAreaDegreesBack*Math.PI/180)+'px solid transparent';
				}
				ctx.okayTiltArea.style.borderLeft = '0px solid transparent';
			}
			if(viewType == 2) ctx.okayTiltArea.style.top = tempBoundingBox.bottom - ctx.okayTiltArea.getBoundingClientRect().bottom+(Math.tan(angle)*(ctx.canvas.width - ctx.sideMainWheelOffset*1.1))+'px';
			else ctx.okayTiltArea.style.top = tempBoundingBox.bottom - ctx.okayTiltArea.getBoundingClientRect().bottom+(Math.tan(Math.abs(angle))*(ctx.sideWheelOffset))+'px';
			if(viewType == 0) {ctx.okayTiltArea.style.webkitTransformOrigin = '0% 100%'; ctx.okayTiltArea.style.MozTransformOrigin = '0% 100%'; ctx.okayTiltArea.style.msTransformOrigin = '0% 100%'; ctx.okayTiltArea.style.OTransformOrigin = '0% 100%';}
			else {ctx.okayTiltArea.style.webkitTransformOrigin = '100% 100%'; ctx.okayTiltArea.style.MozTransformOrigin = '100% 100%'; ctx.okayTiltArea.style.msTransformOrigin = '100% 100%'; ctx.okayTiltArea.style.OTransformOrigin = '100% 100%';}
			if(viewType == 2) {ctx.okayTiltArea.style.webkitTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesBack)*.98+'deg)'; ctx.okayTiltArea.style.MozTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesBack)*.98+'deg)'; ctx.okayTiltArea.style.msTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesBack)*.98+'deg)'; ctx.okayTiltArea.style.OTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesBack)*.98+'deg)';}
			else {ctx.okayTiltArea.style.webkitTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesSide)*.98+'deg)'; ctx.okayTiltArea.style.MozTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesSide)*.98+'deg)'; ctx.okayTiltArea.style.msTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesSide)*.98+'deg)'; ctx.okayTiltArea.style.OTransform = 'rotateZ('+((angle/Math.abs(angle))*ctx.warningAreaDegreesSide)*.98+'deg)';}
		}
		
	
		if(!skipNext) {
			ctx.goodTiltArea = document.createElement('div');
			ctx.goodTiltArea.id = id+'GoodTiltArea';
			ctx.goodTiltArea.className = 'goodTiltArea tiltAreaTriangle';
			document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.goodTiltArea);
			ctx.goodTiltArea.style.position = 'relative';
			ctx.goodTiltArea.style.height = '0px';
			ctx.goodTiltArea.style.width = '0px';
			if(viewType == 0) {
				ctx.goodTiltArea.style.borderBottom = ctx.canvas.width*Math.tan(Math.abs(angle)-(ctx.warningAreaDegreesSide + ctx.okayAreaDegreesSide)*Math.PI/180)+'px solid '+ ctx.color_distArrow;
				ctx.goodTiltArea.style.borderLeft = parseInt(ctx.okayTiltArea.style.borderLeft)/Math.cos(ctx.okayAreaDegreesSide*Math.PI/180)+'px solid transparent';
				ctx.goodTiltArea.style.borderRight = '0px solid transparent';
			} else {
				if(viewType == 1)ctx.goodTiltArea.style.borderBottom = ctx.canvas.width*Math.tan(Math.abs(angle)-(ctx.warningAreaDegreesSide + ctx.okayAreaDegreesSide)*Math.PI/180)+'px solid '+ctx.color_distArrow;
				if(viewType == 2)ctx.goodTiltArea.style.borderBottom = ctx.canvas.width*Math.tan(Math.abs(angle)-(ctx.warningAreaDegreesBack + ctx.okayAreaDegreesBack)*Math.PI/180)+'px solid '+ctx.color_distArrow;
				ctx.goodTiltArea.style.borderLeft = '0px solid transparent';
				if(viewType == 1)ctx.goodTiltArea.style.borderRight = parseInt(ctx.okayTiltArea.style.borderRight)/Math.cos(ctx.okayAreaDegreesSide*Math.PI/180)+'px solid transparent';
				if(viewType == 2)ctx.goodTiltArea.style.borderRight = parseInt(ctx.okayTiltArea.style.borderRight)/Math.cos(ctx.okayAreaDegreesBack*Math.PI/180)+'px solid transparent';
			}
			console.log(ctx.goodTiltArea.getBoundingClientRect().bottom+':gootTiltArea bottom');
			if(viewType == 2) ctx.goodTiltArea.style.top = tempBoundingBox.bottom - ctx.goodTiltArea.getBoundingClientRect().bottom+(Math.tan(angle)*(ctx.canvas.width - ctx.sideMainWheelOffset*1.1))+'px';
			else ctx.goodTiltArea.style.top = tempBoundingBox.bottom - ctx.goodTiltArea.getBoundingClientRect().bottom+(Math.tan(Math.abs(angle))*(ctx.sideWheelOffset))+'px';
			if(viewType == 0) {ctx.goodTiltArea.style.webkitTransformOrigin = '0% 100%'; ctx.goodTiltArea.style.MozTransformOrigin = '0% 100%'; ctx.goodTiltArea.style.msTransformOrigin = '0% 100%'; ctx.goodTiltArea.style.OTransformOrigin = '0% 100%';}
			else {ctx.goodTiltArea.style.webkitTransformOrigin = '100% 100%'; ctx.goodTiltArea.style.MozTransformOrigin = '100% 100%'; ctx.goodTiltArea.style.msTransformOrigin = '100% 100%'; ctx.goodTiltArea.style.OTransformOrigin = '100% 100%';}
			if(viewType == 2) {ctx.goodTiltArea.style.webkitTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesBack+ctx.okayAreaDegreesBack))*.97+'deg)'; ctx.goodTiltArea.style.MozTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesBack+ctx.okayAreaDegreesBack))*.97+'deg)'; ctx.goodTiltArea.style.msTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesBack+ctx.okayAreaDegreesBack))*.97+'deg)'; ctx.goodTiltArea.style.OTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesBack+ctx.okayAreaDegreesBack))*.97+'deg)';}
			else {ctx.goodTiltArea.style.webkitTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesSide+ctx.okayAreaDegreesSide))*.96+'deg)'; ctx.goodTiltArea.style.MozTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesSide+ctx.okayAreaDegreesSide))*.96+'deg)'; ctx.goodTiltArea.style.msTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesSide+ctx.okayAreaDegreesSide))*.96+'deg)'; ctx.goodTiltArea.style.OTransform = 'rotateZ('+((angle/Math.abs(angle))*(ctx.warningAreaDegreesSide+ctx.okayAreaDegreesSide))*.96+'deg)';}
		}
	}
	function renderTiltAngleText(ctx, id, viewType, angle) {
		if(document.getElementById(id+'CogAngleText')) {
			document.getElementById(id+'CogAngleText').parentNode.removeChild(document.getElementById(id+'CogAngleText'));
			if(ctx.debug) console.log('removed existing CogAngleText');
		}
		ctx.cogAngleText = document.createElement('div');
		ctx.cogAngleText.id = id+'CogAngleText';
		ctx.cogAngleText.className = 'cogAngleText';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.cogAngleText);
		// ctx.distLineText.innerHTML = (lText*100).toFixed(0)+' <strong>:</strong> '+(rText*100).toFixed(0);
		ctx.cogAngleText.innerHTML = Math.abs(angle*180/Math.PI).toFixed(1)+'&deg;';
		ctx.cogAngleText.style.font = ctx.style_distFont;
		ctx.cogAngleText.style.position = 'relative';
		ctx.cogAngleText.style.width = ctx.canvas.width+50+'px';
		if(viewType == 0) ctx.cogAngleText.style.textAlign = 'right';
		else ctx.cogAngleText.style.textAlign = 'left';
		tempBoundingBox = ctx.canvas.getBoundingClientRect();
		if(viewType == 2) ctx.cogAngleText.style.top = tempBoundingBox.bottom - ctx.cogAngleText.getBoundingClientRect().bottom+'px';
		else ctx.cogAngleText.style.top = tempBoundingBox.bottom - ctx.cogAngleText.getBoundingClientRect().bottom+'px';
		if(viewType == 0) ctx.cogAngleText.style.left = '0px';
		else ctx.cogAngleText.style.left = '-50px';
		ctx.cogAngleText.style.borderBottom = '1px solid black';
		// ctx.distLineText.style.borderTop = 'none';
		ctx.cogAngleText.style.height = 'auto';
		if(viewType == 0) {ctx.cogAngleText.style.webkitTransformOrigin = (-angle*2)+'% 100%'; ctx.cogAngleText.style.MozTransformOrigin = (-angle*2)+'% 100%'; ctx.cogAngleText.style.msTransformOrigin = (-angle*2)+'% 100%'; ctx.cogAngleText.style.OTransformOrigin = (-angle*2)+'% 100%';}
		else {ctx.cogAngleText.style.webkitTransformOrigin = (100-angle*2)+'% 100%'; ctx.cogAngleText.style.MozTransformOrigin = (100-angle*2)+'% 100%'; ctx.cogAngleText.style.msTransformOrigin = (100-angle*2)+'% 100%'; ctx.cogAngleText.style.OTransformOrigin = (100-angle*2)+'% 100%';}
		if(viewType == 2) {ctx.cogAngleText.style.webkitTransform = 'rotateZ('+(angle*.98)+'rad)'; ctx.cogAngleText.style.MozTransform = 'rotateZ('+(angle*.98)+'rad)'; ctx.cogAngleText.style.msTransform = 'rotateZ('+(angle*.98)+'rad)'; ctx.cogAngleText.style.OTransform = 'rotateZ('+(angle*.98)+'rad)';}
		else { ctx.cogAngleText.style.webkitTransform = 'rotateZ('+(angle*.99)+'rad)'; ctx.cogAngleText.style.MozTransform = 'rotateZ('+(angle*.99)+'rad)'; ctx.cogAngleText.style.msTransform = 'rotateZ('+(angle*.99)+'rad)'; ctx.cogAngleText.style.OTransform = 'rotateZ('+(angle*.99)+'rad)';}
	}

	function renderDistributionIndicators(ctx, id, lText, rText) {
		var tempBoundingBox = 0;
		//Render divs for the text here as well

		if(document.getElementById(id+'LeftDistributionArrow')) {
			document.getElementById(id+'LeftDistributionArrow').parentNode.removeChild(document.getElementById(id+'LeftDistributionArrow'));
			if(ctx.debug) console.log('removed existing leftDistArrow');
		}
		if(this.debug) console.log('rendering distribution arrows');
		ctx.leftDist = document.createElement('div');
		ctx.leftDist.id = id+'LeftDistributionArrow';
		ctx.leftDist.className = 'leftDistributionArrow distributionArrow';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.leftDist);
		ctx.leftDist.style.position = 'relative';
		ctx.leftDist.style.height = '0px';
		ctx.leftDist.style.width = '0px';
		ctx.leftDist.style.borderBottom = ctx.dim_distArrowHeight+'px solid '+ctx.color_distArrow;
		ctx.leftDist.style.borderRight = ctx.dim_distArrowWidth+'px solid transparent';
		ctx.leftDist.style.borderLeft = ctx.dim_distArrowWidth+'px solid transparent';
		if(ctx.isViewFacingFront) {
			ctx.leftDist.style.left = (ctx.sideWheelOffset-ctx.dim_distArrowWidth)+'px';
		} else {
			ctx.leftDist.style.left = (ctx.sideCasterOffset-ctx.dim_distArrowWidth)+'px';
		}

		if(document.getElementById(id+'RightDistributionArrow')) {
			document.getElementById(id+'RightDistributionArrow').parentNode.removeChild(document.getElementById(id+'RightDistributionArrow'));
			if(ctx.debug) console.log('removed existing rightDistArrow');
		}
		ctx.rightDist = document.createElement('div');
		ctx.rightDist.id = id+'RightDistributionArrow';
		ctx.rightDist.className = 'rightDistributionArrow distributionArrow';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.rightDist);
		ctx.rightDist.style.position = 'relative';
		ctx.rightDist.style.height = '0px';
		ctx.rightDist.style.width = '0px';
		ctx.rightDist.style.borderBottom = ctx.dim_distArrowHeight+'px solid '+ctx.color_distArrow;	
		ctx.rightDist.style.top = -1*parseInt(ctx.rightDist.style.borderBottom)+'px';	
		ctx.rightDist.style.borderRight = ctx.dim_distArrowWidth+'px solid transparent';
		ctx.rightDist.style.borderLeft = ctx.dim_distArrowWidth+'px solid transparent';
		if(ctx.isViewFacingFront) {
			ctx.rightDist.style.left = (ctx.canvas.width-ctx.sideWheelOffset-ctx.dim_distArrowWidth)+'px';
		} else {
			ctx.rightDist.style.left = (ctx.sideMainWheelOffset-ctx.dim_distArrowWidth)+'px';
		}


		if(document.getElementById(id+'LeftDistributionArrowText')) {
			document.getElementById(id+'LeftDistributionArrowText').parentNode.removeChild(document.getElementById(id+'LeftDistributionArrowText'));
			if(ctx.debug) console.log('removed existing leftDistArrowText');
		}
		ctx.leftDistText = document.createElement('div');
		ctx.leftDistText.id = id+'LeftDistributionArrowText';
		ctx.leftDistText.className = 'distributionText leftDistributionArrowText';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.leftDistText);
		// ctx.leftDistText.innerHTML = (lText*100).toFixed(1)+'%';
		ctx.leftDistText.innerHTML = 'xxx.x';
		ctx.leftDistText.style.font = ctx.style_distFont;		
		ctx.leftDistText.style.position = 'relative';
		ctx.leftDistText.style.width = (ctx.dim_distArrowWidth*4)+'px';
		ctx.leftDistText.style.textAlign = 'center';
		ctx.leftDistText.style.top = -ctx.dim_distArrowHeight+'px';
		tempBoundingBox = ctx.leftDistText.getBoundingClientRect();
		if(ctx.isViewFacingFront) {
			ctx.leftDistText.style.left = (ctx.sideWheelOffset-ctx.dim_distArrowWidth-(tempBoundingBox.right-tempBoundingBox.left)/4)+'px';
		} else {
			ctx.leftDistText.style.left = (ctx.sideCasterOffset-ctx.dim_distArrowWidth-(tempBoundingBox.right-tempBoundingBox.left)/4)+'px';
		}
		ctx.leftDistText.style.border = '2px solid '+ctx.color_distArrow;
		ctx.leftDistText.style.height = '8px';
		ctx.leftDistText.style.borderBottom = 'none';


		if(document.getElementById(id+'RightDistributionArrowText')) {
			document.getElementById(id+'RightDistributionArrowText').parentNode.removeChild(document.getElementById(id+'RightDistributionArrowText'));
			if(ctx.debug) console.log('removed existing rightDistArrowText');
		}
		ctx.rightDistText = document.createElement('div');
		ctx.rightDistText.id = id+'RightDistributionArrowText';
		ctx.rightDistText.className = 'distributionText rightDistributionArrowText';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.rightDistText);
		// ctx.rightDistText.innerHTML = (rText*100).toFixed(1)+'%';
		ctx.rightDistText.innerHTML = 'xxx.x';
		ctx.rightDistText.style.font = ctx.style_distFont;
		ctx.rightDistText.style.position = 'relative';
		ctx.rightDistText.style.width = (ctx.dim_distArrowWidth*4)+'px';
		ctx.rightDistText.style.textAlign = 'center';
		tempBoundingBox = ctx.leftDistText.getBoundingClientRect();
		ctx.rightDistText.style.top = -ctx.dim_distArrowHeight-(ctx.leftDistText.getBoundingClientRect().bottom-ctx.leftDistText.getBoundingClientRect().top)+'px';
		if(ctx.isViewFacingFront) {
			ctx.rightDistText.style.left = (ctx.canvas.width-ctx.sideWheelOffset-ctx.dim_distArrowWidth-(tempBoundingBox.right-tempBoundingBox.left)/4)+'px';
		} else {
			ctx.rightDistText.style.left = (ctx.sideMainWheelOffset-ctx.dim_distArrowWidth-(tempBoundingBox.right-tempBoundingBox.left)/4)+'px';
		}
		ctx.rightDistText.style.border = '2px solid '+ctx.color_distArrow
		ctx.rightDistText.style.borderBottom = 'none';
		ctx.rightDistText.style.height = '8px';

		
		//render the optimal distro zone here
		// make a function to move/update it whenvevs needed
		
		if(document.getElementById(id+'OptimumWeightDistributionZone')) {
			document.getElementById(id+'OptimumWeightDistributionZone').parentNode.removeChild(document.getElementById(id+'OptimumWeightDistributionZone'));
			if(ctx.debug) console.log('removed existing OptimumWeightDistributionZone');
		}
		ctx.weightDistroZone = document.createElement('div');
		ctx.weightDistroZone.id = id+'OptimumWeightDistributionZone';
		ctx.weightDistroZone.className = 'optimumWeightDistributionZone';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.weightDistroZone);
		ctx.weightDistroZone.style.position = 'relative';
		// ctx.weightDistroZone.style.background = 'rgba(175, 245, 175, .7)';
		if(ctx.isViewFacingFront) {
			ctx.weightDistroZone.style.width = ((ctx.canvas.width-ctx.sideWheelOffset)-ctx.sideWheelOffset)*ctx.maxOkayDistributionErrorLeftToRight*2+'px';
		} else {
			ctx.weightDistroZone.style.width = (ctx.sideMainWheelOffset-ctx.sideCasterOffset)*ctx.maxOkayDistributionErrorFrontToBack*2+'px';
		} 
		ctx.weightDistroZone.style.height = ctx.canvas.height+'px';
		tempBoundingBox = document.getElementById(ctx.canvas.id).parentNode.getBoundingClientRect();
		ctx.weightDistroZone.style.top = (tempBoundingBox.top-ctx.weightDistroZone.getBoundingClientRect().top)+'px';
		if(ctx.isViewFacingFront) {
			ctx.weightDistroZone.style.left = ((ctx.canvas.width-ctx.sideWheelOffset*2)*ctx.optimumDistZoneLeftToRight)+ctx.sideWheelOffset-(parseInt(ctx.weightDistroZone.style.width)/2)+'px';
		} else {
			ctx.weightDistroZone.style.left = ctx.sideMainWheelOffset-((ctx.sideMainWheelOffset-ctx.sideCasterOffset)*ctx.optimumDistZoneFrontToBack)-(parseInt(ctx.weightDistroZone.style.width)/2)+'px';
		}

		if(document.getElementById(id+'WeightDistributionLine')) {
			document.getElementById(id+'WeightDistributionLine').parentNode.removeChild(document.getElementById(id+'WeightDistributionLine'));
			if(ctx.debug) console.log('removed existing WeightDistributionLine');
		}
		ctx.weightDistroLine = document.createElement('div');
		ctx.weightDistroLine.id = id+'WeightDistributionLine';
		ctx.weightDistroLine.className = 'weightDistributionLine';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.weightDistroLine);
		ctx.weightDistroLine.style.position = 'relative';
		ctx.weightDistroLine.style.background = 'red';
		ctx.weightDistroLine.style.width = '1px'; 
		ctx.weightDistroLine.style.height = ctx.canvas.height+'px';
		tempBoundingBox = document.getElementById(ctx.canvas.id).parentNode.getBoundingClientRect();
		ctx.weightDistroLine.style.top = (tempBoundingBox.top-(ctx.weightDistroLine.getBoundingClientRect().top))+'px';
		if(ctx.isViewFacingFront) {
			ctx.weightDistroLine.style.left = (((ctx.canvas.width-ctx.sideWheelOffset*2))*lText)+ctx.sideWheelOffset+'px';
		} else {
			ctx.weightDistroLine.style.left = ctx.sideMainWheelOffset-((ctx.sideMainWheelOffset-ctx.sideCasterOffset)*lText)+'px';
		}

		if(document.getElementById(id+'WeightDistributionLineArrow')) {
			document.getElementById(id+'WeightDistributionLineArrow').parentNode.removeChild(document.getElementById(id+'WeightDistributionLineArrow'));
			if(ctx.debug) console.log('removed existing WeightDistributionLineArrow');
		}
		ctx.weightDistroLineArrow = document.createElement('div');
		ctx.weightDistroLineArrow.id = id+'WeightDistributionLineArrow';
		ctx.weightDistroLineArrow.className = 'weightDistributionLineArrow';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.weightDistroLineArrow);
		ctx.weightDistroLineArrow.style.position = 'relative';
		ctx.weightDistroLineArrow.style.borderTop = ctx.dim_distLineArrowHeight+'px solid '+ctx.color_distLineArrow;
		ctx.weightDistroLineArrow.style.width = '0px';
		ctx.weightDistroLineArrow.style.height = '0px';
		ctx.weightDistroLineArrow.style.borderLeft = ctx.dim_distLineArrowWidth+'px solid transparent';
		ctx.weightDistroLineArrow.style.borderRight = ctx.dim_distLineArrowWidth+'px solid transparent'; 
		tempBoundingBox = document.getElementById(ctx.canvas.id).parentNode.getBoundingClientRect();
		ctx.weightDistroLineArrow.style.top = (tempBoundingBox.top-(ctx.weightDistroLineArrow.getBoundingClientRect().top))+'px';
		if(ctx.isViewFacingFront) {
			ctx.weightDistroLineArrow.style.left = (((ctx.canvas.width-ctx.sideWheelOffset*2))*lText)+ctx.sideWheelOffset-ctx.dim_distLineArrowWidth+'px';
		} else {
			ctx.weightDistroLineArrow.style.left = ctx.sideMainWheelOffset-((ctx.sideMainWheelOffset-ctx.sideCasterOffset)*lText)-ctx.dim_distLineArrowWidth+'px';
		}

		if(document.getElementById(id+'DistributionLineText')) {
			document.getElementById(id+'DistributionLineText').parentNode.removeChild(document.getElementById(id+'DistributionLineText'));
			if(ctx.debug) console.log('removed existing DistributionLineText');
		}
		ctx.distLineText = document.createElement('div');
		ctx.distLineText.id = id+'DistributionLineText';
		ctx.distLineText.className = 'distributionText distributionLineText';
		document.getElementById(ctx.canvas.id).parentNode.appendChild(ctx.distLineText);
		// ctx.distLineText.innerHTML = (lText*100).toFixed(0)+' <strong>:</strong> '+(rText*100).toFixed(0);
		ctx.distLineText.innerHTML = 'XX <strong>:</strong> XX';
		ctx.distLineText.style.font = ctx.style_distFont;
		ctx.distLineText.style.position = 'relative';
		ctx.distLineText.style.width = (ctx.dim_distLineArrowWidth*5)+'px';
		ctx.distLineText.style.textAlign = 'center';
		tempBoundingBox = document.getElementById(ctx.canvas.id).parentNode.getBoundingClientRect();
		ctx.distLineText.style.top = (tempBoundingBox.top-(ctx.distLineText.getBoundingClientRect().bottom))+'px';
		if(ctx.isViewFacingFront) {
			ctx.distLineText.style.left = (((ctx.canvas.width-ctx.sideWheelOffset*2))*lText)+ctx.sideWheelOffset-ctx.dim_distLineArrowWidth*2.5+'px';
		} else {
			ctx.distLineText.style.left = ctx.sideMainWheelOffset-((ctx.sideMainWheelOffset-ctx.sideCasterOffset)*lText)-ctx.dim_distLineArrowWidth*2.5+'px';
		}
		ctx.distLineText.style.borderBottom = '1px solid red';
		// ctx.distLineText.style.borderTop = 'none';
		ctx.distLineText.style.height = 'auto';
	}

	function renderFrontFacingWheelchair(ctx, id) {
		initFrontViewChairCanvas(ctx, id);
		drawFrontHandles(ctx);
		drawFrontAxels(ctx);
		drawFrontPushRims(ctx);
		drawFrontWheelsMain(ctx);
		drawFrontWheelsCastors(ctx);
		drawFrontFrame(ctx);
		drawFrontFootRests(ctx);
		drawFrontSeat(ctx);
		drawArmRests(ctx);
	}
	function initFrontViewChairCanvas(ctx, id) {
		ctx.canvas = document.createElement('canvas');
		ctx.canvas.height = ctx.dim_objectHeight;
		if(ctx.isViewFacingFront) {
			ctx.canvas.width = .9*ctx.canvas.height;
		} else {
			ctx.canvas.width = ctx.canvas.height;
		}
		ctx.canvas.id = id;
		ctx.canvas.className = 'aWeightAnalysisGraphicCanvas aFrontViewChairCanvas';
		var tempParent = document.getElementById(ctx.belongsTo);
		if(tempParent) {
			tempParent.appendChild(ctx.canvas);
		} else {
			document.body.appendChild(ctx.canvas);
		}
		ctx.context = ctx.canvas.getContext('2d');
		// ctx.context.fillStyle = '#FFF';
		// ctx.context.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);

		//init some basic dimensions
		ctx.dim_wheelBaseWidth = .65*ctx.canvas.width;
		ctx.lineWidthFrame = ctx.canvas.width/35;
		ctx.sideFrameOffset = (ctx.canvas.width-ctx.dim_wheelBaseWidth)/2;
		ctx.bottomFrameOffset = .075*ctx.canvas.height;
		ctx.topFrameOffset = .9*ctx.canvas.height;

		ctx.dim_wheelRadiusMain = ctx.canvas.height*1/3.3;
		ctx.dim_frontWheelWidth = ctx.lineWidthFrame*1.5;

		ctx.dim_frontAxelWidth = ctx.canvas.height/45;
		ctx.dim_frontAxelHeight = ctx.canvas.height/50;
	}
	function drawFrontHandles(ctx) {
		ctx.context.arc(ctx.sideFrameOffset, ctx.bottomFrameOffset*1.1, ctx.lineWidthFrame*.7, Math.PI*2, 0);
		ctx.context.arc(ctx.canvas.width - ctx.sideFrameOffset, ctx.bottomFrameOffset*1.1, ctx.lineWidthFrame*.7, Math.PI*2, 0);
		ctx.context.fillStyle = ctx.color_handleGrips;
		ctx.context.fill();
	}
	function drawFrontFrame(ctx) {
		ctx.context.beginPath();
		ctx.context.lineWidth = ctx.lineWidthFrame;
		ctx.context.lineCap = 'round';
		ctx.context.moveTo(ctx.sideFrameOffset, ctx.bottomFrameOffset);
		ctx.context.lineTo(ctx.sideFrameOffset, ctx.topFrameOffset);
		ctx.context.moveTo(ctx.sideFrameOffset+ctx.dim_wheelBaseWidth, ctx.topFrameOffset);
		ctx.context.lineTo(ctx.sideFrameOffset+ctx.dim_wheelBaseWidth, ctx.bottomFrameOffset);
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawFrontWheelsMain(ctx) {
		ctx.dim_wheelRadiusMain = ctx.canvas.height*1/3.3;
		ctx.dim_frontWheelWidth = ctx.lineWidthFrame*1.5;
		ctx.sideWheelOffset = ctx.sideFrameOffset-(ctx.lineWidthFrame/2)-ctx.dim_frontAxelWidth-(ctx.dim_frontWheelWidth/2);

		ctx.context.beginPath();
		ctx.context.moveTo(ctx.sideWheelOffset, ctx.canvas.height-(ctx.dim_frontWheelWidth/2));
		ctx.context.lineTo(ctx.sideWheelOffset, ctx.canvas.height-(ctx.dim_wheelRadiusMain*2));
		ctx.context.moveTo(ctx.canvas.width-ctx.sideWheelOffset, ctx.canvas.height-(ctx.dim_wheelRadiusMain*2));
		ctx.context.lineTo(ctx.canvas.width-ctx.sideWheelOffset, ctx.canvas.height-(ctx.dim_frontWheelWidth/2));
		ctx.context.lineCap = 'round';
		ctx.context.lineWidth = ctx.dim_frontWheelWidth;
		ctx.context.strokeStyle = ctx.color_wheelRubber;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawFrontWheelsCastors(ctx) {
		ctx.dim_frontCastorWidth = ctx.lineWidthFrame*1.2;
		ctx.dim_wheelRadiusCastors = ctx.canvas.height*.125;
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.sideFrameOffset, ctx.canvas.height-(ctx.dim_frontCastorWidth/2));
		ctx.context.lineTo(ctx.sideFrameOffset, ctx.canvas.height-(ctx.dim_wheelRadiusCastors*2));
		ctx.context.moveTo(ctx.canvas.width-ctx.sideFrameOffset, ctx.canvas.height-(ctx.dim_wheelRadiusCastors*2));
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset, ctx.canvas.height-(ctx.dim_frontCastorWidth/2));
		ctx.context.lineCap = 'round';
		ctx.context.strokeStyle = ctx.color_wheelRubber;
		ctx.context.lineWidth = ctx.dim_frontCastorWidth;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawFrontAxels(ctx) {
		ctx.dim_sidePushRimOffset = (ctx.dim_frontAxelWidth*2.5)+ctx.dim_frontWheelWidth;
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.sideFrameOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain);
		ctx.context.lineTo(ctx.sideFrameOffset - ctx.dim_sidePushRimOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain);
		ctx.context.moveTo(ctx.canvas.width - ctx.sideFrameOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain);
		ctx.context.lineTo(ctx.canvas.width - ctx.sideFrameOffset + ctx.dim_sidePushRimOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain);
		ctx.context.lineCap = 'butt';
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.lineWidth = ctx.dim_frontAxelHeight;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawFrontPushRims(ctx) {
		ctx.dim_pushRimWidth = ctx.dim_frontWheelWidth*.65;
		ctx.dim_pushRimsRadius = ctx.dim_wheelRadiusMain*.95;

		ctx.context.beginPath();
		ctx.context.moveTo(ctx.sideFrameOffset-ctx.dim_sidePushRimOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain-ctx.dim_frontWheelWidth+ctx.dim_pushRimsRadius);
		ctx.context.lineTo(ctx.sideFrameOffset-ctx.dim_sidePushRimOffset, ctx.canvas.height-(ctx.dim_pushRimsRadius*2));
		ctx.context.moveTo(ctx.canvas.width-ctx.sideFrameOffset+ctx.dim_sidePushRimOffset, ctx.canvas.height-(ctx.dim_pushRimsRadius*2));
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset+ctx.dim_sidePushRimOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain-ctx.dim_frontWheelWidth+ctx.dim_pushRimsRadius);
		ctx.context.lineCap = 'round';
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.lineWidth = ctx.dim_pushRimWidth;
		ctx.context.stroke();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.moveTo(ctx.sideFrameOffset-ctx.dim_sidePushRimOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain-ctx.dim_frontWheelWidth+(ctx.dim_pushRimsRadius*.95));
		ctx.context.lineTo(ctx.sideFrameOffset-(ctx.lineWidthFrame/2)-ctx.dim_frontAxelWidth-(ctx.dim_frontWheelWidth/2),ctx.canvas.height-ctx.dim_wheelRadiusMain-ctx.dim_frontWheelWidth+(ctx.dim_pushRimsRadius*.95));
		ctx.context.moveTo(ctx.sideFrameOffset-ctx.dim_sidePushRimOffset, ctx.canvas.height-(ctx.dim_pushRimsRadius*1.95));
		ctx.context.lineTo(ctx.sideFrameOffset-(ctx.lineWidthFrame/2)-ctx.dim_frontAxelWidth-(ctx.dim_frontWheelWidth/2),ctx.canvas.height-(ctx.dim_pushRimsRadius*1.95));
		ctx.context.moveTo(ctx.canvas.width-ctx.sideFrameOffset+ctx.dim_sidePushRimOffset, ctx.canvas.height-ctx.dim_wheelRadiusMain-ctx.dim_frontWheelWidth+(ctx.dim_pushRimsRadius*.95));
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/2)+ctx.dim_frontAxelWidth+(ctx.dim_frontWheelWidth/2), ctx.canvas.height-ctx.dim_wheelRadiusMain-ctx.dim_frontWheelWidth+(ctx.dim_pushRimsRadius*.95));
		ctx.context.moveTo(ctx.canvas.width-ctx.sideFrameOffset+ctx.dim_sidePushRimOffset, ctx.canvas.height-(ctx.dim_pushRimsRadius*1.95));
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/2)+ctx.dim_frontAxelWidth+(ctx.dim_frontWheelWidth/2), ctx.canvas.height-(ctx.dim_pushRimsRadius*1.95));
		ctx.context.lineWidth = ctx.dim_frontAxelWidth*.5;
		ctx.context.lineCap = 'butt';
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawFrontFootRests(ctx) {
		ctx.dim_footRestsWidth = ctx.canvas.width/4.5;
		ctx.dim_footRestsHeight = ctx.canvas.height/50;
		ctx.context.fillStyle = ctx.color_footRests;
		ctx.context.fillRect(ctx.sideFrameOffset-(ctx.lineWidthFrame/1.25), ctx.topFrameOffset, ctx.dim_footRestsWidth, ctx.dim_footRestsHeight);
		ctx.context.fillRect(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/1.25), ctx.topFrameOffset, -ctx.dim_footRestsWidth, ctx.dim_footRestsHeight);

		ctx.context.beginPath();
		ctx.context.moveTo(ctx.sideFrameOffset-(ctx.lineWidthFrame/1.25)+(ctx.dim_footRestsWidth/6), ctx.topFrameOffset);
		ctx.context.lineTo(ctx.sideFrameOffset-(ctx.lineWidthFrame/1.25)+(ctx.dim_footRestsWidth*1/4), ctx.topFrameOffset-ctx.dim_footRestsHeight);
		ctx.context.lineTo(ctx.sideFrameOffset-(ctx.lineWidthFrame/1.25)+(ctx.dim_footRestsWidth*3/4) ,ctx.topFrameOffset-ctx.dim_footRestsHeight)
		ctx.context.lineTo(ctx.sideFrameOffset-(ctx.lineWidthFrame/1.25)+(ctx.dim_footRestsWidth*5/6) ,ctx.topFrameOffset);
		ctx.context.closePath();
		ctx.context.fill();

		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/1.25)-(ctx.dim_footRestsWidth/6), ctx.topFrameOffset);
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/1.25)-(ctx.dim_footRestsWidth*1/4), ctx.topFrameOffset-ctx.dim_footRestsHeight);
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/1.25)-(ctx.dim_footRestsWidth*3/4), ctx.topFrameOffset-ctx.dim_footRestsHeight);
		ctx.context.lineTo(ctx.canvas.width-ctx.sideFrameOffset+(ctx.lineWidthFrame/1.25)-(ctx.dim_footRestsWidth*5/6), ctx.topFrameOffset);
		ctx.context.closePath();
		ctx.context.fill();
	}
	function drawFrontSeat(ctx) {
		ctx.dim_seatHeight = ctx.canvas.height/3.5;
		ctx.context.fillRect(ctx.sideFrameOffset-ctx.lineWidthFrame/2, ctx.bottomFrameOffset*1.5, ctx.dim_wheelBaseWidth+ctx.lineWidthFrame, ctx.dim_seatHeight*.75);
		ctx.context.fillRect(ctx.sideFrameOffset +ctx.lineWidthFrame/2, ctx.bottomFrameOffset*1.5+ctx.dim_seatHeight*.74, ctx.dim_wheelBaseWidth-ctx.lineWidthFrame, ctx.dim_seatHeight*.25);
		ctx.context.fillRect(ctx.sideFrameOffset + ctx.lineWidthFrame/2, ctx.bottomFrameOffset*1.75+ctx.dim_seatHeight, ctx.dim_wheelBaseWidth-ctx.lineWidthFrame, ctx.dim_seatHeight/1.5);
		ctx.context.fillStyle = ctx.color_seatCusion;
		ctx.context.fillRect(ctx.sideFrameOffset + ctx.lineWidthFrame/2, ctx.bottomFrameOffset*1.75+ctx.dim_seatHeight+ctx.dim_seatHeight/1.5, ctx.dim_wheelBaseWidth-ctx.lineWidthFrame, ctx.dim_seatHeight*.15);
	}
	function drawArmRests(ctx) {
		ctx.context.fillRect(ctx.sideFrameOffset-ctx.lineWidthFrame, ctx.bottomFrameOffset*1.5+ctx.dim_seatHeight*.75, ctx.lineWidthFrame*2, ctx.dim_seatHeight*.175);
		ctx.context.fillRect(ctx.canvas.width-ctx.sideFrameOffset-ctx.lineWidthFrame, ctx.bottomFrameOffset*1.5+ctx.dim_seatHeight*.75, ctx.lineWidthFrame*2, ctx.dim_seatHeight*.175);
		
		ctx.context.fillStyle = ctx.color_frame;
		ctx.context.fillRect(ctx.sideFrameOffset-ctx.lineWidthFrame/2, ctx.bottomFrameOffset*1.5+ctx.dim_seatHeight*.8, ctx.lineWidthFrame, ctx.dim_seatHeight*.13);
		ctx.context.fillRect(ctx.canvas.width-ctx.sideFrameOffset-ctx.lineWidthFrame/2, ctx.bottomFrameOffset*1.5+ctx.dim_seatHeight*.8, ctx.lineWidthFrame, ctx.dim_seatHeight*.13);
	}

	function renderSideFacingWheelchair(ctx, id) {
		initSideViewChairCanvas(ctx, id);
		drawSideSeat(ctx);
		drawSideFrame(ctx);
		drawSideArmRests(ctx);
		drawSideWheelMain(ctx);
		drawSideWheelCastor(ctx);
		drawSideFootRests(ctx);
		drawSideCastorSupport(ctx);

	}
	function initSideViewChairCanvas(ctx, id) {
		ctx.canvas = document.createElement('canvas');
		ctx.canvas.height = ctx.dim_objectHeight;
		ctx.canvas.width = ctx.canvas.height*1.25;
		ctx.canvas.id = id;
		ctx.canvas.className = 'aWeightAnalysisGraphicCanvas aSideViewChairCanvas';
		var tempParent = document.getElementById(ctx.belongsTo);
		if(tempParent) {
			tempParent.appendChild(ctx.canvas);
		} else {
			document.body.appendChild(ctx.canvas);
		}
		ctx.context = ctx.canvas.getContext('2d');
		// ctx.context.fillStyle = '#FFF';
		// ctx.context.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);

		ctx.lineWidthFrame = (ctx.canvas.height*.9)/35;
		ctx.bottomFrameOffset = .075*ctx.canvas.height;
		ctx.topFrameOffset = .9*ctx.canvas.height;
		ctx.dim_wheelRadiusMain = ctx.canvas.height*1/3.3;
		ctx.dim_wheelRadiusCastors = ctx.canvas.height*.125;
		ctx.dim_seatHeight = ctx.canvas.height/3.5;
		ctx.dim_armRestHeight = ctx.dim_seatHeight*.175;
		ctx.dim_pushRimsRadius = ctx.dim_wheelRadiusMain*.95;
	}
	function drawSideWheelMain(ctx) {
		var centerX = ctx.canvas.width-ctx.dim_wheelRadiusMain*1.2;
		ctx.sideMainWheelOffset = centerX;
		var centerY = ctx.canvas.height-ctx.dim_wheelRadiusMain*1.1;
		ctx.dim_frontWheelWidth = ctx.canvas.width*.015;

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusMain*1, Math.PI*2, 0);
		ctx.context.strokeStyle = ctx.color_wheelRubber;
		ctx.context.lineWidth = ctx.dim_frontWheelWidth*3;
		ctx.context.stroke();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusMain*.95, Math.PI*2, 0);
		ctx.context.strokeStyle = ctx.color_footRests;
		ctx.context.lineWidth = ctx.dim_frontWheelWidth;
		ctx.context.stroke();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusMain*.175, Math.PI*2, 0);
		ctx.context.fillStyle = ctx.color_frame;
		ctx.context.fill();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusMain*.14, Math.PI*2, 0);
		ctx.context.fillStyle = ctx.color_footRests;
		ctx.context.fill();
		ctx.context.closePath();

		//drawSpokes
		var totalNumberOfSpokes = 60;
		var innerOuterOffset = 45*Math.PI/180;
		var spokeSpacing = Math.PI*2/(totalNumberOfSpokes/2+1);
		var radius = ctx.dim_wheelRadiusMain*.16;
		ctx.context.beginPath();
		for(i=0; i<totalNumberOfSpokes; i++) {
			ctx.context.moveTo(centerX+Math.sin(i*spokeSpacing)*radius, centerY-Math.cos(i*spokeSpacing)*radius);
			ctx.context.lineTo(centerX+Math.sin(i*spokeSpacing+innerOuterOffset)*(ctx.dim_wheelRadiusMain*.86), centerY-Math.cos(i*spokeSpacing+innerOuterOffset)*(ctx.dim_wheelRadiusMain*.85));
			if(i == totalNumberOfSpokes-1) {
				for(j=totalNumberOfSpokes; j>0; j--) { 
					ctx.context.moveTo(centerX+Math.sin(j*spokeSpacing)*radius, centerY-Math.cos(j*spokeSpacing)*radius);
					ctx.context.lineTo(centerX+Math.sin(j*spokeSpacing-innerOuterOffset)*(ctx.dim_wheelRadiusMain*.86), centerY-Math.cos(j*spokeSpacing-innerOuterOffset)*(ctx.dim_wheelRadiusMain*.85));
				}
			}
		}
		ctx.context.lineWidth = ctx.dim_frontWheelWidth*.25;
		ctx.context.strokeStyle = ctx.color_spokes;
		ctx.context.stroke();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusMain*.89, Math.PI*2, 0);
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.lineWidth = ctx.dim_frontWheelWidth*1.35;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawSideWheelCastor(ctx) {
		var centerX = ctx.canvas.width-ctx.dim_wheelRadiusMain*2.9;
		ctx.sideCasterOffset = centerX;
		var centerY = ctx.canvas.height-ctx.dim_wheelRadiusCastors;
		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusCastors*.9, Math.PI*2, 0);
		ctx.context.strokeStyle = ctx.color_wheelRubber;
		ctx.context.lineWidth = ctx.dim_wheelRadiusCastors*.2;
		ctx.context.stroke();
		ctx.context.closePath();

		//draw spokes
		var totalNumberOfSpokes = 6;
		var innerOuterOffset = 0;
		var spokeSpacing = Math.PI*2/(totalNumberOfSpokes+1);
		var radius = ctx.dim_wheelRadiusCastors*.2;
		ctx.context.beginPath();
		for(i=0; i<=totalNumberOfSpokes; i++) {
			ctx.context.moveTo(centerX+Math.sin(i*spokeSpacing)*radius, centerY-Math.cos(i*spokeSpacing)*radius);
			ctx.context.lineTo(centerX+Math.sin(i*spokeSpacing+innerOuterOffset)*(ctx.dim_wheelRadiusCastors*.65), centerY-Math.cos(i*spokeSpacing+innerOuterOffset)*(ctx.dim_wheelRadiusCastors*.65));
		}
		ctx.context.lineWidth = ctx.lineWidthFrame*.25;
		ctx.context.strokeStyle = ctx.color_castorSpokes;
		ctx.context.stroke();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusCastors*.73, Math.PI*2, 0);
		ctx.context.strokeStyle = ctx.color_footRests;
		ctx.context.lineWidth = ctx.dim_wheelRadiusCastors*.15
		ctx.context.stroke();
		ctx.context.closePath();

		ctx.context.beginPath();
		ctx.context.arc(centerX, centerY, ctx.dim_wheelRadiusCastors*.2, Math.PI*2, 0);
		ctx.context.fillStyle = ctx.color_footRests;
		ctx.context.fill();
		ctx.context.closePath();
	}
	function drawSideFrame(ctx) {
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width*.95, ctx.bottomFrameOffset*1.2);
		ctx.context.lineTo(ctx.canvas.width*.87, ctx.bottomFrameOffset*.9);
		ctx.context.lineWidth = ctx.lineWidthFrame*1.2;
		ctx.context.lineCap = 'butt';
		ctx.context.strokeStyle = '#000';
		ctx.context.stroke();
		ctx.context.closePath();
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width*.87, ctx.bottomFrameOffset*.9);
		ctx.context.lineTo(ctx.canvas.width*.83, ctx.bottomFrameOffset*.75);
		ctx.context.arc(ctx.canvas.width*.81, ctx.bottomFrameOffset*1.14, (ctx.bottomFrameOffset*1.2-ctx.bottomFrameOffset*.75), Math.atan(ctx.canvas.width*.81, ctx.bottomFrameOffset*1.14)+Math.PI, Math.atan(ctx.canvas.width*.81, ctx.bottomFrameOffset*1.14)+Math.PI/1.75, true);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*1.1, ctx.canvas.height-ctx.dim_wheelRadiusMain*2);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*1.2,ctx.canvas.height-ctx.dim_wheelRadiusMain*1.1);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.95, ctx.canvas.height-ctx.dim_wheelRadiusCastors*3);
		ctx.context.moveTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.99, ctx.canvas.height-ctx.dim_wheelRadiusCastors*2);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.82,ctx.canvas.height-ctx.dim_wheelRadiusCastors*5.5);
		ctx.context.arc(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.66 ,ctx.canvas.height-ctx.dim_wheelRadiusCastors*5.4, (ctx.dim_wheelRadiusMain*2.82-ctx.dim_wheelRadiusMain*2.66), Math.atan(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.85,ctx.canvas.height-ctx.dim_wheelRadiusCastors*5)+Math.PI/2, Math.PI*1.55);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*1.05, ctx.canvas.height-ctx.dim_wheelRadiusMain*2.27);
		ctx.context.moveTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*1.15,ctx.canvas.height-ctx.dim_wheelRadiusMain*1.50);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.86,ctx.canvas.height-ctx.dim_wheelRadiusCastors*4);
		ctx.context.arc(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.95, ctx.canvas.height-ctx.dim_wheelRadiusCastors*3.47, ctx.dim_wheelRadiusCastors*4-ctx.dim_wheelRadiusCastors*3.47, Math.PI*1.5, Math.PI*1.14, true);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*3.5,ctx.canvas.height-ctx.dim_wheelRadiusCastors*1.2);

		ctx.context.lineWidth = ctx.lineWidthFrame;
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawSideArmRests(ctx) {
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*1.2, ctx.canvas.height-ctx.dim_wheelRadiusMain*2.33);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.5, ctx.canvas.height-ctx.dim_wheelRadiusMain*2.44);
		
		ctx.context.lineWidth = ctx.lineWidthFrame*1.2;
		ctx.context.strokeStyle = ctx.color_seat;
		ctx.context.lineCap = 'round';
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawSideSeat(ctx) {
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.93, ctx.canvas.height-ctx.dim_wheelRadiusMain*1.71);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*1.24, ctx.canvas.height-ctx.dim_wheelRadiusMain*1.56);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*.96, ctx.bottomFrameOffset*1.4);
		
		ctx.context.lineWidth = ctx.lineWidthFrame*1.2;
		ctx.context.strokeStyle = ctx.color_seat;
		ctx.context.lineCap = 'round';
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawSideFootRests(ctx) {
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*3.5,ctx.canvas.height-ctx.dim_wheelRadiusCastors*1.2);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*3.85,ctx.canvas.height-ctx.dim_wheelRadiusCastors*1.3);
		
		ctx.context.lineWidth = ctx.lineWidthFrame*.75;
		ctx.context.strokeStyle = ctx.color_footRests;
		ctx.context.lineCap = 'round';
		ctx.context.stroke();
		ctx.context.closePath();
	}
	function drawSideCastorSupport(ctx) {
		ctx.context.beginPath();
		ctx.context.moveTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.9, ctx.canvas.height-ctx.dim_wheelRadiusCastors);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*3.02, ctx.canvas.height-ctx.dim_wheelRadiusCastors*2);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.94, ctx.canvas.height-ctx.dim_wheelRadiusCastors*2);
		ctx.context.lineTo(ctx.canvas.width-ctx.dim_wheelRadiusMain*2.9, ctx.canvas.height-ctx.dim_wheelRadiusCastors);

		ctx.context.lineWidth = ctx.lineWidthFrame*1.2;
		ctx.context.strokeStyle = ctx.color_frame;
		ctx.context.lineCap = 'round';
		ctx.context.stroke();
		ctx.context.closePath();
	}


}




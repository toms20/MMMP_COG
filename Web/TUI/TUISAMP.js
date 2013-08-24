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


function init() {
	console.log('Javascript initiated');
	testData = [[0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0], [0, 0, 0]];
	bars = ['weightBarVal', 'loadBarValQ1', 'wheelBarValQ1', 'loadBarValQ2', 'wheelBarValQ2', 'loadBarValQ3', 'wheelBarValQ3', 'loadBarValQ4', 'wheelBarValQ4', 'distroBarValFB', 'distroBarValLR'];
}

function btnConnect() {
	if(simulatingData) {
		console.log('btnConnect Clicked, terminating randomized data');
		document.getElementById('btnConnect').innerHTML = 'Connect';
		clearInterval(simInterval);
		simulatingData = false;
	} else {
		console.log('btnConnect Clicked, commencing randomized data');
		simInterval = window.setInterval(function() {randomizeData()}, 500);
		document.getElementById('btnConnect').innerHTML = 'Disconnect';
		simulatingData = true;
	}
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

function randomizeData() {
	console.log('simulating data');
	randomWeight();
	randomDistros();
	randomLoads();
	randomCOMs();
	updateTUI();
}

function randomWeight() {
	testData[0][0] = weightVariance*Math.random()+mainWeight;
}

function randomDistros() {
	testData[3][0] = rearDist+((Math.random()-Math.random())*weightVariance/400);
	testData[3][1] = leftDist+((Math.random()-Math.random())*weightVariance/600);
}

function randomLoads() {
	testData[1][0] = testData[0][0]*(1-testData[3][0])*(1-testData[3][1]);
	testData[1][1] = testData[0][0]*(testData[3][0])*(1-testData[3][1]);
	testData[1][2] = testData[0][0]*(testData[3][0])*(testData[3][1]);
	testData[1][3] = testData[0][0]*(1-testData[3][0])*(testData[3][1]);
}

function randomCOMs() {

}

function updateTUI() {
	if(testData[0][0]) {
		document.getElementById('weightBarVal').style.width = (testData[0][0]/700)*100+'%';
		document.getElementById('weightTextval').innerHTML = (testData[0][0]).toFixed(1)+'lb';
	}
	if(testData[1]) {
		document.getElementById('loadBarValQ1').style.width = (testData[1][0]/maxCellLoad)*100+'%';
		document.getElementById('loadTextValQ1').innerHTML = (testData[1][0]).toFixed(1)+'lb';

		document.getElementById('loadBarValQ2').style.width = (testData[1][1]/maxCellLoad)*100+'%';
		document.getElementById('loadTextValQ2').innerHTML = (testData[1][1]).toFixed(1)+'lb';

		document.getElementById('loadBarValQ3').style.width = (testData[1][2]/maxCellLoad)*100+'%';
		document.getElementById('loadTextValQ3').innerHTML = (testData[1][2]).toFixed(1)+'lb';

		document.getElementById('loadBarValQ4').style.width = (testData[1][3]/maxCellLoad)*100+'%';
		document.getElementById('loadTextValQ4').innerHTML = (testData[1][3]).toFixed(1)+'lb';
	}
	if(testData[3]) {
		// max left = 88%
		document.getElementById('distroBarValFB').style.left = (testData[3][0]*0.88)*100+'%';
		document.getElementById('distroTextValFB').innerHTML = ((1-testData[3][0])*100).toFixed(0)+':'+((testData[3][0])*100).toFixed(0);
		document.getElementById('distroBarValFB').style.background = 'rgba('+(Math.round(Math.abs(testData[3][0]-optimumFB)*255*12))+','+(Math.round((.8-(Math.abs(testData[3][0]-optimumFB)))*255))+',150, 1)';

		document.getElementById('distroBarValLR').style.left = ((1-testData[3][1])*.88)*100+'%';
		document.getElementById('distroTextValLR').innerHTML = ((testData[3][1])*100).toFixed(0)+':'+((1-testData[3][1])*100).toFixed(0);
		document.getElementById('distroBarValLR').style.background = 'rgba('+(Math.round(Math.abs(testData[3][1]-optimumLR)*255*20))+','+(Math.round((.8-(Math.abs(testData[3][1]-optimumLR)))*255))+',150, 1)';
	}
}




window.addEventListener('load', init, false);
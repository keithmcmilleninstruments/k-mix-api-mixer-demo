 // vendor
import interact from "interact.js";

// styles
import './styles/screen.scss'

// svg
import './svg/kmix.svg'

// modules
import KMIX from 'k-mix-api'
import { allowed, webmidi } from './modules/browser'
import { convertRange } from './modules/utilities'
import request from './modules/midiRequest'
import { default as ac, playAll, stopAll, buildSounds } from './modules/audio'
import { controlSVGRotary, controlSVGFader, controlSVGButton, controlFader, controlRotary, faderDrag, rotaryDrag, buttonClick, resetfadersSVG, resetrotariesSVG } from './modules/svgControls'
	
// global kmix
var kmix;

var helpControl = document.querySelector('.help.control'),
		helpInput = document.querySelector('.help.input'),
		helpMain = document.querySelector('.help.main'),
		helpMisc = document.querySelector('.help.misc'),
		svg = document.querySelector('svg'),
		activeButtons = []

// MIDI & check browser
if(allowed() && webmidi){
	// request midi / sysex permission
	var MIDIRequest = request();

	MIDIRequest.then(function(data){
		var MIDIAccess = data;
		
		kmix = KMIX(MIDIAccess)

		// set up device event handlers
		kmix.on('diamond-up', function(data) {
			console.log('diamond-up', data);
			// record
		});

		kmix.on('diamond-right', function(data) {
			console.log('diamond-right', data);
			playAll()
			resetfadersSVG(svg)
			resetrotariesSVG(svg)
			resetFaders()
			resetRotaries()
		});

		kmix.on('diamond-down', function(data) {
			console.log('diamond-down', data);

			stopAll()
			buildSounds()
			resetfadersSVG(svg)
			resetrotariesSVG(svg)
			resetFaders()
			resetRotaries()
		});

		kmix.on('diamond-left', function(data) {
			console.log('diamond-left', data);

			stopAll()
			buildSounds()
			playAll()
			resetfadersSVG(svg)
			resetrotariesSVG(svg)
			resetFaders()
			resetRotaries()
		});

		kmix.on('any', function(data) {
			var control = data.control, 
					value = data.value;

			console.log('control', control);

			if(control.includes('fader')){
				var controller = control.split('-'), 
						channel = controller[1];

				if(channel === 'master'){
					window.kmix.master.gain.value = convertRange(value, [0, 127], [0, 1])
				} else {
					if(window.kmix.tracks[channel-1]) window.kmix.tracks[channel-1].volume.gain.value = convertRange(value, [0, 127], [0, 1])
				}
				controlSVGFader('#' + control +' .fader-handle', data.value, svg)
				
			} else if(control.includes('rotary')){
				var shift = 0, channel, pan = convertRange(value, [0, 127], [-1, 1]);
				
				shift = (activeButtons.indexOf('button-eq') !== -1) ? 4 : 0;

				channel = +control.split('-')[1] + shift

				if(window.kmix.tracks[channel-1]) window.kmix.tracks[channel-1].panner.setPosition(pan, 0, 1 - Math.abs(pan))

				controlSVGRotary('#' + control +' .rotary-handle', data.raw[2], svg)

			} else if(control.includes('button') || control.includes('channel')){
				if(control.includes(':')) {
					var index = activeButtons.indexOf(control.split(':')[1])
					activeButtons.splice(index, 1)
				} else {
					controlSVGButton(control, data[0], svg)
					activeButtons.push(control)
				}
			}
		
		});

	})
	.catch(function(err){
		throw new Error(err);
	});

} else {
	console.log('Web MIDI Not Supported');
}

// send help message
helpControl.addEventListener('click', function(){
	kmix.help('control')
})
helpInput.addEventListener('click', function(){
	kmix.help('input')
})
helpMain.addEventListener('click', function(){
	kmix.help('main')
})
helpMisc.addEventListener('click', function(){
	kmix.help('misc')
})

// SVG interactions
interact('.fader-handle')
	.draggable({
		axis: 'y'
  }).on('dragmove', function (event) {
		var id = event.target.parentNode.id,
				value = event.target.getAttribute('data-y')
	  faderDrag(event)
	  if(window.kmix.tracks.length) controlFader(id, value)
	  // control LEDs
	  kmix.send('control:' + id, convertRange(value, [0, -90], [0, 127]))
	})

interact('.rotary-handle')
	.draggable({
		axis: 'x'
  }).on('dragmove', function (event) {
		var id = event.target.parentNode.id,
				value = event.target.getAttribute('data-x')
  	rotaryDrag(event)
  	if(window.kmix.tracks.length) controlRotary(id, value)
  	// control LEDs
  	kmix.send('control:' + id, convertRange(value, [-126, 126], [0, 127]))
	})

interact('.button').on('down', function (event) {
	buttonClick(event)
});

// reset
function resetFaders(){
	let fader = ['fader-1', 'fader-2', 'fader-3', 'fader-4', 'fader-5', 'fader-6', 'fader-7', 'fader-8', 'fader-master']

	fader.forEach(function(fader){
		kmix.send('control:' + fader, 0)
	})
}

function resetRotaries(){
	let rotaries = ['rotary-1', 'rotary-2', 'rotary-3', 'rotary-4']

	rotaries.forEach(function(rotary){
		kmix.send('control:' + rotary, 64)
	})
}

// tests
function rampFader(fader, from, to){
	let time = 0

	for(let i = from; i < to; i++){
		kmix.send('control:fader-1', i) // control, value, time, bank
	}
}

// Listen
// kmix.on('fader-1', callback)
// kmix.on('button-vu', callback)
// kmix.on('button-vu:off', callback)
// kmix.on('any', callback)

// Send
// send to audio-control:
// send('preset', 2)
// send('fader:1', 127)
// send('fader:1', 127, 'input', time) // with time
// send('reverb-bypass', 11, 'misc') // auto channel
// send('mute', 11, 'main_out') // auto channel

// send to control-surface
// send('control:fader-3', 0, 'cc', time, bank) // value, time, bank

// send raw
// send([176, 1, 127], time, 'control')
// enable audio-control sysex output [0xF0, 0x00, 0x01, 0x5F, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF7]

// Help
// help('control') // 'control', 'input', 'main_out', 'misc'
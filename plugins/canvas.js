/* 
 *    JAVASCRIPT PLUGIN
 * 
 *    Support for writing Javascript using Waterbear
 *
 */


// Pre-load dependencies
yepnope({
    load: [ 'plugins/canvas.css',
            'plugins/canvas_demos.js',
            'lib/beautify.js',
            'lib/highlight.js',
            'lib/highlight-javascript.js',
            'lib/highlight-github.css'
    ],
    complete: setup
});

// Add some utilities
jQuery.fn.extend({
  extract_script: function(){
      if (this.length === 0) return '';
      if (this.is(':input')){
		  if (this.parent().is('.trig')){
		      return this.val();
          }else if (this.parent().is('.string')){
              return '"' + this.val() + '"';
          }else{
              return this.val();
          }
      }
      if (this.is('.empty')) return '/* do nothing */';
      return this.map(function(){
          var self = $(this);
          var script = self.data('script');
          if (!script) return null;
          var exprs = $.map(self.socket_blocks(), function(elem, idx){return $(elem).extract_script();});
          var blks = $.map(self.child_blocks(), function(elem, idx){return $(elem).extract_script();});
          if (exprs.length){
              // console.log('expressions: %o', exprs);
              function exprf(match, offset, s){
                  // console.log('%d args: <%s>, <%s>, <%s>', arguments.length, match, offset, s);
                  var idx = parseInt(match.slice(2,-2), 10) - 1;
                  // console.log('index: %d, expression: %s', idx, exprs[idx]);
                  return exprs[idx];
              };
              //console.log('before: %s', script);
              script = script.replace(/\{\{\d\}\}/g, exprf);
              //console.log('after: %s', script);
          }
          if (blks.length){
              function blksf(match, offset, s){
                  var idx = parseInt(match.slice(2,-2), 10) - 1;
                  return blks[idx];
              }
              // console.log('child before: %s', script);
              script = script.replace(/\[\[\d\]\]/g, blksf);
              // console.log('child after: %s', script);   
          }
          next = self.next_block().extract_script();
          if (script.indexOf('[[next]]') > -1){
              script = script.replace('[[next]]', next);
          }else{
              if (self.is('.step, .trigger')){
                  script = script + next;
              }
          }
          return script;
      }).get().join('');
  },
  wrap_script: function(){
      // wrap the top-level script to prevent leaking into globals
      var script = this.pretty_script();
      var retval = 'var global = new Global();(function($){var local = new Local();try{local.canvas = $("<canvas width=\\"" + global.stage_width + "\\" height=\\"" + global.stage_height + "\\"></canvas>").appendTo(".stage");local.ctx = local.canvas[0].getContext("2d");' + script + '}catch(e){alert(e);}})(jQuery);';
      //var retval = 'var global = new Global();(function($){var local = new Local();local.canvas = $("<canvas width=\\"" + global.stage_width + "\\" height=\\"" + global.stage_height + "\\"></canvas>").appendTo(".stage");local.ctx = local.canvas[0].getContext("2d");' + script + '})(jQuery);';
      return retval;
  },
  pretty_script: function(){
      return js_beautify(this.map(function(){ return $(this).extract_script();}).get().join(''));
  },
  write_script: function(view){
      view.html('<pre class="language-javascript">' + this.pretty_script().replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</pre>');
      hljs.highlightBlock(view.children()[0]);
  }
});

function setup(){
    // This file depends on the runtime extensions, which should probably be moved into this namespace rather than made global

window.update_scripts_view = function(){
    var blocks = $('.workspace:visible .scripts_workspace > .wrapper');
    var view = $('.workspace:visible .scripts_text_view');
    blocks.write_script(view);
}

function run_scripts(event){
    $('.stage')[0].scrollIntoView();
    var blocks = $('.workspace:visible .scripts_workspace > .trigger');
    // Why not just eval?
    $('.stage').replaceWith('<div class="stage"><script>' + blocks.wrap_script() + '</script></div>');
    //eval(blocks.wrap_script());
}
$('.run_scripts').click(run_scripts);

// End UI section


// expose these globally so the Block/Label methods can find them
window.choice_lists = {
    keys: 'abcdefghijklmnopqrstuvwxyz0123456789*+-./'
        .split('').concat(['up', 'down', 'left', 'right',
        'backspace', 'tab', 'return', 'shift', 'ctrl', 'alt', 
        'pause', 'capslock', 'esc', 'space', 'pageup', 'pagedown', 
        'end', 'home', 'insert', 'del', 'numlock', 'scroll', 'meta']),
	trig: ['sin', 'cos', 'tan'],
	fourfunc: ['+', '-', '*', '/'],
	equalities: ['<', '<=', '===', '>=', '>'],
    unit: ['px', 'em', '%', 'pt'],
    arity: ['0', '1', '2', '3', 'array', 'object'],
    types: ['string', 'number', 'boolean', 'array', 'object', 'function', 'color', 'shape', 'point', 'size', 'rect', 'gradient', 'pattern', 'imagedata', 'pixel', 'any'],
    rettypes: ['none', 'string', 'number', 'boolean', 'array', 'object', 'function', 'color', 'shape', 'point', 'size', 'rect', 'gradient', 'pattern', 'imagedata','any'],
    easing: ['>', '<', '<>', 'backIn', 'backOut', 'bounce', 'elastic'],
    fontweight: ['normal', 'bold', 'inherit']
};

// Hints for building blocks
//
//
// Value blocks can nest, so don't end them with semi-colons (i.e., if there is a "type" specified).
//
//
var menus = {
    control: menu('Control', [
        {
            label: 'when program runs',
            trigger: true,
            slot: false,
            containers: 1,
            script: 'function _start(){[[1]]}_start();',
            help: 'this trigger will run its scripts once when the program starts'
        },
        {
            label: 'when [choice:keys] key pressed', 
            trigger: true,
            slot: false,
            containers: 1,
            script: '$(document).bind("keydown", {{1}}, function(){[[1]]; return false;});',
            help: 'this trigger will run the attached blocks every time this key is pressed'
        },
        {
            label: 'repeat [number:30] times a second',
            trigger: true,
            slot: false,
            containers: 1,
            locals: [
                {
                    label: 'count##',
                    script: 'local.count##',
                    type: 'number'
                }
            ],
            script: '(function(){var count## = 0; setInterval(function(){count##++; local.count## = count##;[[1]]},1000/{{1}})})();',
            help: 'this trigger will run the attached blocks periodically'
        },
        {
            label: 'wait [number:1] secs',
            containers: 1,
            script: 'setTimeout(function(){[[1]]},1000*{{1}});',
            help: 'pause before running the following blocks'
        },
        {
            label: 'repeat [number:10]', 
            containers: 1, 
            script: 'for (local.index## = 0; local.index## < {{1}}; local.index##++){[[1]]};',
            help: 'repeat the contained blocks so many times',
            locals: [
                {
                    label: 'loop index##',
                    script: 'local.index##',
                    type: 'number'
                }
            ]
        },
        {
            label: 'broadcast [string:ack] message', 
            script: '$(".stage").trigger({{1}});',
            help: 'send this message to any listeners'
        },
        {
            label: 'when I receive [string:ack] message', 
            trigger: true,
            slot: false,
            containers: 1,
            script: '$(".stage").bind({{1}}, function(){[[1]]});',
            help: 'add a listener for the given message, run these blocks when it is received'
        },
        {
            label: 'forever if [boolean:false]', 
            containers: 1,  
            script: 'while({{1}}){[[1]]}',
            help: 'repeat until the condition is false'
        },
        {
            label: 'if [boolean]', 
            containers: 1, 
            script: 'if({{1}}){[[1]]}',
            help: 'run the following blocks only if the condition is true'
        },
        {
            label: 'if [boolean]', 
            containers: 2,
            subContainerLabels: ['else'],
            script: 'if({{1}}){[[1]]}else{[[2]]}',
            help: 'run the first set of blocks if the condition is true, otherwise run the second set'
        },
        {
            label: 'repeat until [boolean]', 
            containers: 1, 
            script: 'while(!({{1}})){[[1]]}',
            help: 'repeat forever until condition is true'
        }
            ]),
    variables : menu("Variables", [
        {
            label: 'variable string## [string]',
            script: 'local.string## = {{1}};',
            returns: {
                label: 'string##',
                script: 'local.string##',
                type: 'string'
            },
            help: 'create a reference to re-use the string'
        },
        {
            label: 'variable number## [number]',
            script: 'local.number## = {{1}};',
            returns: {
                label: 'number##',
                script: 'local.number##',
                type: 'number'
            },
            help: 'create a reference to re-use the number'
        },
        {
            label: 'variable boolean## [boolean]',
            script: 'local.boolean## = {{1}};',
            returns: {
                label: 'boolean##',
                script: 'local.boolean##',
                type: 'boolean'
            },
            help: 'create a reference to re-use the boolean'
        },
        {
            label: 'variable array## [array]',
            script: 'local.array## = {{1}};',
            returns: {
                label: 'array##',
                script: 'local.array## = {{1}}',
                type: 'array'
            },
            help: 'create a reference to re-use the array'
        },
        {
            label: 'variable shape## [shape]',
            script: 'local.shape## = {{1}};',
            returns: {
                label: 'shape##',
                script: 'local.shape##',
                type: 'shape'
            },
            help: 'create a reference to re-use the shape'
        },
        {
            label: 'variable point## [point]',
            script: 'local.point## = {{1}};',
            returns: {
                label: 'point##',
                script: 'local.point##',
                type: 'point'
            },
            help: 'create a reference to re-use the point'
        },
        {
            label: 'variable imagedata## [imagedata]',
            script: 'local.imagedata## = {{1}};',
            returns: {
                label: 'imagedata##',
                script: 'local.imagedata##',
                type: 'imagedata'
            },
            help: 'create a reference to re-use the imagedata'
        },
        {
            label: 'variable any## [any]',
            script: 'local.any## = {{1}};',
            returns: {
                label: 'any##',
                script: 'local.any##',
                type: 'any'
            },
            help: 'create a reference to re-use any variable type'
        },
        {   
            label: 'variable pixel## [pixel]',
            script: 'local.pixel## = {{1}};',
            returns: {
                label: 'pixel##',
                script: 'local.pixel##',
                type: 'pixel'
            },
            help: 'Creates a new pixel variable'
        },
		{
		label: 'parse int from [string]',
		script: 'parseInt({{1}})',
		type: 'number',
		help: 'returning a number from a string'
	},
	{
            label: 'Increment [number] by [number]',
            script: "{{1}} = {{1}} + {{2}};",
            help: 'increment variable by number'
        },
	{
		label: 'change [boolean: ] to [boolean]',
		script: '{{1}} = {{2}};',
		help: 'setting the value of a boolean variable'
	}
    ]),
    img: menu('Image Manipulation', [
        {
            label: 'when image at url [string] loads',
            trigger: true,
            slot: false,
            containers: 1,
            script: '(function(){' +
                        'var i = new Image();' +
                        'i.src = {{1}};' +
                        '$(i).load(function(){' +
                            'var can = $("<canvas>")[0];' +
                            'can.height=i.height;' +
                            'can.width=i.width;' +
                            'can.getContext("2d").drawImage(i, 0, 0);' +
                            'local.imagedata## = can.getContext("2d").getImageData(0, 0, i.width, i.height);' +
                            '[[1]]});' +
                        '})()',
            locals: [
                {
                    label: 'imagedata##',
                    script: 'local.imagedata##',
                    type: 'imagedata'
                }
            ],
            help: 'this trigger will run its scripts once the given image is loaded'
        },
        {
            label: 'red [number] green [number] blue [number]',
            script: '{ r : {{1}}, g: {{2}}, b: {{3}} }',
            type: 'pixel',
            help: 'Gets a pixel from three rgb numbers'
        },
        {
            label: 'red from pixel [pixel]',
            script: '{{1}}.r',
            type: 'number',
            help: 'Gets the red value from a pixel'
        },
        {
            label: 'green from pixel [pixel]',
            script: '{{1}}.g',
            type: 'number',
            help: 'Gets the green value from a pixel'
        },
        {
            label: 'blue from pixel [pixel]',
            script: '{{1}}.b',
            type: 'number',
            help: 'Gets the blue value from a pixel'
        },
        {
            label: 'new ImageData with width [number] and height [number]',
            script: '(function(){ return local.ctx.createImageData({{1}},{{2}});})()',
            type: 'imagedata',
            help: 'initialize a new imageData with the specified dimensions'
        },
        {
            label: 'put pixel [pixel] to [imagedata] at point [point]',
            script: '(function(){ var data = {{2}}.data; var x = {{3}}.x; var y = {{3}}.y; var redIndex = (x * 4) + (y * {{2}}.width * 4); data[redIndex] = {{1}}.r; data[redIndex + 1] = {{1}}.g; data[redIndex + 2] = {{1}}.b; data[redIndex + 3] = 255;})();',
            help: 'set the pixel in the given image data to the given pixel'
        },
        {
            label: 'get pixel at coordinates [number:0] [number:0] from [imagedata]',
            script: '(function(){ var data = {{3}}.data; var redIndex = ({{1}} * 4) + ({{2}} * {{3}}.width * 4); return { r: data[redIndex], g: data[redIndex + 1], b: data[redIndex + 2]};})()',
            type: 'pixel'
        },
        {
            label: 'imageData [imagedata] width',
            script: '{{1}}.width',
            type: 'number'
        },
        {
            label: 'imageData [imagedata] height',
            script: '{{1}}.height',
            type: 'number'
        },
        {
            label: 'draw imageData [imagedata] at point [point]',
            script: 'local.ctx.putImageData({{1}},{{2}}.x,{{2}}.y);',
            help: 'draw the given image data into the canvas at the given coordinates'
        }
    ]),
    /*array: menu('Arrays', [
        {
            label: 'new array##',
            script: 'local.array## = [];',
            help: 'Create an empty array',
            returns: {
                label: 'array##',
                script: 'local.array##',
                type: 'array'
            }
        },
        {
            label: 'new array with array## [array]',
            script: 'local.array## = {{1}}.slice();',
            help: 'create a new array with the contents of another array',
            returns: {
                label: 'array##',
                script: 'local.array##',
                type: 'array'
            }
        },
        {
            label: 'array [array] item [number:0]',
            script: '{{1}}[{{2}}]',
            type: 'any',
            help: 'get an item from an index in the array'
        },
        {
            label: 'array [array] join with [string:, ]',
            script: '{{1}}.join({{2}})',
            type: 'string',
            help: 'join items of an array into a string, each item separated by given string'
        },
        {
            label: 'array [array] append [any]',
            script: '{{1}}.push({{2}});',
            help: 'add any object to an array'
        },
        {
            label: 'array [array] length',
            script: '{{1}}.length',
            type: 'number',
            help: 'get the length of an array'
        },
        {
            label: 'array [array] remove item [number:0]',
            script: '{{1}}.splice({{2}}, 1)[0]',
            type: 'any',
            help: 'remove item at index from an array'
        },
        {
            label: 'array [array] pop',
            script: '{{1}}.pop()',
            type: 'any',
            help: 'remove and return the last item from an array'
        },
        {
            label: 'array [array] shift',
            script: '{{1}}.shift()',
            type: 'any',
            help: 'remove and return the first item from an array'
        },
        {   
            label: 'array [array] reversed',
            script: '{{1}}.slice().reverse()',
            type: 'array',
            help: 'reverse a copy of array'
        },
        {
            label: 'array [array] concat [array]',
            script: '{{1}}.concat({{2}});',
            type: 'array',
            help: 'a new array formed by joining the arrays'
        },
        {
            label: 'array [array] for each',
            script: '$.each({{1}}, function(idx, item){local.index = idx; local.item = item; [[1]] });',
            containers: 1,
            locals: [
                {
                    label: 'index',
                    script: 'local.index',
                    help: 'index of current item in array',
                    type: 'number'
                },
                {
                    label: 'item',
                    script: 'local.item',
                    help: 'the current item in the iteration',
                    type: 'any'
                }
            ],
            help: 'run the blocks with each item of a named array'
        }
    ], false),*/
    strings: menu('Strings', [
        {
            label: 'string [string] split on [string]',
            script: '{{1}}.split({{2}})',
            type: 'array',
            help: 'create an array by splitting the named string on the given string'
        },
        {
            label: 'string [string] character at [number:0]',
            script: '{{1}}[{{2}}]',
            type: 'string',
            help: 'get the single character string at the given index of named string'
        },
        {
            label: 'string [string] length',
            script: '{{1}}.length',
            type: 'number',
            help: 'get the length of named string'
        },
        {
            label: 'string [string] indexOf [string]',
            script: '{{1}}.indexOf({{2}})',
            type: 'number',
            help: 'get the index of the substring within the named string'
        },
        {
            label: 'string [string] replace [string] with [string]',
            script: '{{1}}.replace({{2}}, {{3}})',
            type: 'string',
            help: 'get a new string by replacing a substring with a new string'
        },
        {
            label: 'to string [any]',
            script: '({{1}}).toString()',
            type: 'string',
            help: 'convert any object to a string'
        },
        {
            label: 'concatenate [string:hello] with [string:world]', 
            'type': 'string', 
            script: "({{1}} + {{2}})",
            help: 'returns a string by joining together two strings'
        },
        {
            label: 'case-sensitive [string:dodge] = [string:ball]', 
            'type': 'boolean',
            script: "({{1}} === {{2}})",
            help: 'returns whether two strings are equal (case matters)'
        },
        {
            label: 'case-insensitive [string:butter] = [string:fly]', 
            'type': 'boolean',
            script: "({{1}}.toLowerCase() === {{2}}.toLowerCase())",
            help: 'returns whether two strings are equal (case doesn\'t matter)'
        },
        {
            label: 'alert [string]',
            script: 'window.alert({{1}});',
            help: 'pop up an alert window with string'
        }
    ], false),
    sensing: menu('Sensing', [
        {
            label: 'ask [string:What\'s your name?] and wait',
            script: 'local.answer## = prompt({{1}},"");',
            returns: {
                label: 'answer##',
                type: 'string',
                script: 'local.answer##'
            },
            help: 'Prompt the user for information'
        },
        {
            label: 'mouse x', 
            'type': 'number', 
            script: 'mouse_x',
            help: 'The current horizontal mouse position'
        },
        {
            label: 'mouse y', 
            'type': 'number', 
            script: 'mouse_y',
            help: 'the current vertical mouse position'
        },
        {
            label: 'mouse down', 
            'type': 'boolean', 
            script: 'global.mouse_down',
            help: 'true if the mouse is down, false otherwise'
        },
        {
            label: 'key [choice:keys] pressed?', 
            'type': 'boolean', 
            script: '$(document).bind("keydown", {{1}}, function(){[[1]]});',
            help: 'is the given key down when this block is run?'
        },
        {
            label: 'stage width', 
            'type': 'number', 
            script: 'global.stage_width',
            help: 'width of the stage where scripts are run. This may change if the browser window changes'
        },
        {
            label: 'stage height', 
            'type': 'number', 
            script: 'global.stage_height',
            help: 'height of the stage where scripts are run. This may change if the browser window changes.'
        },
        {
            label: 'center x', 
            'type': 'number', 
            script: 'global.stage_center_x',
            help: 'horizontal center of the stage'
        },
        {
            label: 'center y', 
            'type': 'number', 
            script: 'global.stage_center_y',
            help: 'vertical center of the stage'
        },
        {
            label: 'reset timer', 
            script: 'global.timer.reset();',
            help: 'set the global timer back to zero'
        },
        {
            label: 'timer', 
            'type': 'number', 
            script: 'global.timer.value()',
            help: 'seconds since the script began running'
        }
    ]),
    operators: menu('Math', [
		{
			label: '[choice:trig] of [number: ]',
			'type': 'number',
			script: "Math.{{1}}(deg2rad({{2}}))",
			help: 'trig functions of the number'
		},
		{
			label: ' inverse [choice:trig] of [number: ]',
			'type': 'number',
			script: "rad2deg(Math.a{{1}}({{2}}))",
			help: 'inverse trig functions of the number'
		},
        {
                label: '[number:0] [choice:fourfunc] [number:0]', 
                'type': 'number', 
                script: "({{1}} {{2}} {{3}})",
                help: 'Applies one of the four operations to the two operands'
        },
		
        {
            label: 'pick random [number:1] to [number:10]', 
            'type': 'number', 
            script: "randint({{1}}, {{2}})",
            help: 'random number between two numbers (inclusive)'
        },
		{
                label: '[number:0] [choice:equalities] [number:0]',
                'type': 'boolean',
                script: "({{1}} {{2}} {{3}})",
                help: 'compares two numbers'
            },
       
        {
            label: '[boolean] and [boolean]', 
            'type': 'boolean', 
            script: "({{1}} && {{2}})",
            help: 'both operands are true'
        },
        {
            label: '[boolean] or [boolean]', 
            'type': 'boolean', 
            script: "({{1}} || {{2}})",
            help: 'either or both operands are true'
        },
        {
            label: '[boolean] xor [boolean]',
            'type': 'boolean',
            script: "({{1}} ? !{{2}} : {{2}})",
            help: 'either, but not both, operands are true'
        },
        {
            label: 'not [boolean]', 
            'type': 'boolean', 
            script: "(! {{1}})",
            help: 'operand is false'
        },
        {
            label: '[number:0] mod [number:0]', 
            'type': 'number', 
            script: "({{1}} % {{2}})",
            help: 'modulus of a number is the remainder after whole number division'
        },
        {
            label: 'round [number:0]', 
            'type': 'number', 
            script: "Math.round({{1}})",
            help: 'rounds to the nearest whole number'
        },
        {
            label: 'absolute of [number:10]', 
            'type': 'number', 
            script: "Math.abs({{2}})",
            help: 'converts a negative number to positive, leaves positive alone'
        },
        {
            label: '[number:10] to the power of [number:2]', 
            'type': 'number', 
            script: 'Math.pow({{1}}, {{2}})',
            help: 'multiply a number by itself the given number of times'
        },
        {
            label: 'square root of [number:10]', 
            'type': 'number', 
            script: 'Math.sqrt({{1}})',
            help: 'the square root is the same as taking the to the power of 1/2'
        },
		{
           label: 'ceiling of [number:10]', 
           'type': 'number', 
           script: 'Math.ceil({{1}})',
           help: 'rounds up to nearest whole number'
        },
		{
			label: 'floor of [number: ]',
			'type': 'number',
			script: 'Math.floor({{1}})',
			help: 'rounds down to the nearest whole number'
		},
        {
            label: 'pi',
            script: 'Math.PI;',
            type: 'number',
            help: "pi is the ratio of a circle's circumference to its diameter"
        }
    ]),
    canvas: menu('Drawing', [
		{
			label: 'clear the stage',
			script: "local.ctx.clearRect ( 0 , 0 , global.stage_width , global.stage_height );",
			help: 'clears the stage, returning it to white'
		},
        {
            label: 'fill circle at point [point] with radius [number:10]',
            script: 'local.ctx.beginPath();local.ctx.arc({{1}}.x,{{1}}.y,{{2}},0,Math.PI*2,true);local.ctx.closePath();local.ctx.fill();',
            help: 'circle...'
        },
        {
            label: 'stroke circle at point [point] with radius [number:10]',
            script: 'local.ctx.beginPath();local.ctx.arc({{1}}.x,{{1}}.y,{{2}},0,Math.PI*2,true);local.ctx.closePath();local.ctx.stroke();',
            help: 'circle...'
        },
        // Path API
        {
            label: 'move to point [point]',
            script: 'local.ctx.moveTo({{1}}.x,{{1}}.y);',
            help: 'move to...'
        },
        {
            label: 'line to point [point]',
            script: 'local.ctx.lineTo({{1}}.x,{{1}}.y);',
            help: 'line to...'
        },
        {
            label: 'quadraditic curve to point [point] with control point [point]',
            script: 'local.ctx.quadraticCurveTo({{2}}.x, {{2}}.y, {{1}}.x, {{1}}.y);',
            help: 'quad curve to ...'
        },
        {
            label: 'circle at point [point] with radius [number:10]',
            script: 'local.ctx.arc({{1}}.x,{{1}}.y,{{2}},0,Math.PI*2,true);',
            help: 'circle...'
        },
        {
            label: 'clip',
            script: 'local.ctx.clip();',
            help: 'adds current path to the clip area'
        },
        {
            label: 'is point [point] in path?',
            script: 'local.ctx.isPointInPath({{1}}.x,{{1}}.y)',
            type: 'boolean',
            help: 'test a point against the current path'
        },
        // Colour and Styles
        {
            label: 'stroke color [color:#000]',
            script: 'local.ctx.strokeStyle = "{{1}}";',
            help: 'stroke color...'
        },
        {
            label: 'fill color [color:#000]',
            script: 'local.ctx.fillStyle = "{{1}}";',
            help: 'fill color...'
        },
        // Text
        {
            label: 'font [number:10] [choice:unit] [string:sans-serif]',
            script: 'local.ctx.font = {{1}}+{{2}}+" "+{{3}};',
            help: 'set the current font'
        },
        {
            label: 'fill text [string] x [number:0] y [number:0]',
            script: 'local.ctx.fillText({{1}},{{2}},{{3}});',
            help: 'basic text operation'
        },
        {
            label: 'text [string] width',
            script: 'local.ctx.measureText({{1}}).width',
            type: 'number'
        },
        // Compositing
        {
            label: 'transparency [number:1.0]',
            script: 'local.ctx.globalAlpha = {{1}};',
            help: 'set the transparency'
        },
        // Transforms
        {
            label: 'scale x [number:1.0] y [number:1.0]', 
            script: 'local.ctx.scale({{1}},{{2}});',
            help: 'change the scale of subsequent drawing'
        },
        {
            label: 'rotate by [number:0] degrees', 
            script: 'local.ctx.rotate(deg2rad({{1}}));',
            help: 'rotate...'
        },
        {
            label: 'translate by x [number:0] y [number:0]', 
            script: 'local.ctx.translate({{1}},{{2}});',
            help: 'translate...'
        },
        // Line caps/joins
        
        {
            label: 'line width [number:1]',
            script: 'local.ctx.lineWidth = {{1}};',
            help: 'set line width'
        }
    ]),
    point: menu('Point', [
        {
            label: 'point at x [number:0] y [number:0]',
            script: '{x: {{1}}, y: {{2}}}',
            type: 'point'
        },
        {
            label: 'point from array [array]',
            script: '{x: {{1}}[0], y: {{1}}[1]}',
            type: 'point'
        },
        {
            label: 'point [point] x',
            script: '{{1}}.x',
            type: 'number'
        },
        {
            label: 'point [point] y',
            script: '{{1}}.y',
            type: 'number'
        },
        {
            label: 'point [point] as array',
            script: '[{{1}}.x, {{1}}.y]',
            type: 'array'
        }
    ]),
    shapes: menu('Shapes', [
        {
            label: 'rect at x [number:0] y [number:0] with width [number:10] height [number:10]',
            script: '{x: {{1}}, y: {{2}}, w: {{3}}, h: {{4}} }',
            type: 'rect'
        },
        {
            label: 'rect from array [array]',
            script: '{x: {{1}}[0], y: {{1}}[1], w: {{1}}[2], h: {{1}}[3] };',
            type: 'rect'
        },
        {
            label: 'rect [rect] position',
            script: '{x: {{1}}.x, y: {{1}}.y}',
            type: 'point'
        },
        {
            label: 'rect [rect] size',
            script: '{w: {{1}}.w, h: {{1}}.h}',
            type: 'size'
        },
        {
            label: 'rect [rect] as array',
            script: '[{{1}}.x, {{1}}.y, {{1}}.w, {{1}}.h]',
            type: 'array'
        },
        {
            label: 'rect [rect] x',
            script: '{{1}}.x',
            type: 'number'
        },
        {
            label: 'rect [rect] y',
            script: '{{1}}.y',
            type: 'number'
        },
        {
            label: 'rect [rect] width',
            script: '{{1}}.w',
            type: 'number'
        },
        {
            label: 'rect [rect] height',
            script: '{{1}}.h',
            type: 'number'
        },
		{
			label: 'clear rect [rect]', 
			script: 'local.ctx.clearRect({{1}}.x,{{1}}.y,{{1}}.w,{{1}}.h);',
			help: 'clear...'
        },
        {
            label: 'fill rect [rect]', 
            script: 'local.ctx.fillRect({{1}}.x,{{1}}.y,{{1}}.w,{{1}}.h);',
            help: 'fill...'
        },
        {
            label: 'stroke rect [rect]', 
            script: 'local.ctx.strokeRect({{1}}.x,{{1}}.y,{{1}}.w,{{1}}.h);',
            help: 'stroke...'
        },
        {
            label: 'rect [rect]',
            script: 'local.ctx.rect({{1}},{{1}},{{1}},{{1}});',
            help: 'rect...'
        },
        // Pixel Manipulation
        {
            label: 'get imageData## for rect [rect]',
            script: 'local.imageData## = local.ctx.getImageData({{1}}.x,{{1}}.y,{{1}}.w,{{1}}.h);',
            returns: {
                label: 'imageData##',
                script: 'local.imageData##',
                type: 'imagedata'
            },
            help: 'returns the image data from the specified rectangle'
        },
        {
            label: 'draw a rect [rect] from imageData [imagedata] at point [point]',
            script: 'local.ctx.putImageData({{2}},{{3}}.x,{{3}}.y,{{1}}.x,{{1}}.y,{{1}}.w,{{1}}.h);',
            help: 'draw the given image data into the canvas from the given rect to the given position'
        }
    ]),
    video: menu('Video', [
        {
            label: 'For every frame of video at [string:url]',
            containers: 1,
            // Executes argument when video begins to play, then calls itself
            // again in 50 milliseconds
            script: 'var vid = $("<video>");' +
                    'var v = vid[0];' +
                    'var source = $("<source>");' +
                    'source.prop("src", {{1}});' +
                    'vid.prop("controls", true);' +
                    'vid.append(source);' + 
                    'vid.css("float", "left");' +
                    '$(".stage").prepend(vid);' +
                    'v.addEventListener("play", function(){' +
                        'var canvas = $("<canvas>");' + 
                        'var width = v.clientWidth;' +
                        'var height = v.clientHeight;' +
                        'canvas[0].width = width;' +
                        'canvas[0].height = height;' +
                        'var con = canvas[0].getContext("2d");' +
                        'function everyframe(){' +
                            'if (v.paused || v.ended) return false;' +
                            'con.drawImage(v,0, 0, width, height);' +
                            'local.frame## = con.getImageData(0, 0, width, height);' +
                            '(function(){ [[1]] }());' +
                            'setTimeout(everyframe, 50);' +
                        '}' +
                        'everyframe();' +
                    '});',
            locals: [ { 
                        label: 'frame##',
                        script: 'local.frame##',
                        help: 'The current frame of the playing video',
                        type: 'imagedata'
                      }
                    ],
            trigger: true
        }
    ])
};

// Demo functionality has been moved to canvas_demos.js
$('.scripts_workspace').trigger('init');
console.log("Done");

$('.socket input').live('click',function(){
    $(this).focus();
    $(this).select();
});

//Add the variable menu
var body = $('<section class="submenu"></section>');
var select = $('<h3 class="select"><a href="#">' + "Variable" + '</a></h3>').appendTo(body);
var options = $('<div id="varlist" class="option"></div>').appendTo(body);
options.append('<button id="mkvarbutton">Make a variable</button>');
$("#accordion").append(body);
$('#mkvarbutton').click(function() {$("#new_var_dialog").dialog('open'); });
pluginReady();

}

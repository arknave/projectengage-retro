// UI Chrome Section

function accordion(event){
    // console.log('accordion');
    var self = $(this);
    if (self.hasClass('selected')){
        self.removeClass('selected').siblings('.option').slideUp('slow');
        return;
    }
    $('.select.selected').removeClass('selected').siblings('.option').slideUp('slow');
    self.addClass('selected').siblings('.option').slideDown('slow');
    $('#block_menu').trigger('open', self);
}
$('#block_menu').delegate('.select', 'click', accordion);


function test_block(block){
    var name = block.data('klass') + ': ' + block.data('label');
    try{
        eval(block.wrap_script());
        // console.log('passed: %s', name);
        return true;
    }catch(e){
        if (e.name === 'SyntaxError'){
            console.error('failed: %s, %o', name, e);
            return false;
        }else{
            // console.warn('passed with error: %s, %o', name, e);
            return true;
        }
    }
}

function test(){
    var blocks = $('#accordion .wrapper, .block_menu .wrapper');
    var total = blocks.length;
    var success = 0;
    var fail = 0;
    console.log('running %d tests', total);
    blocks.each(function(idx, elem){
        setTimeout(function(){
            // console.log('running test %d', idx);
            test_block($(elem)) ? success++ : fail++;
            if( success + fail === total){
                console.log('Ran %d tests, %d successes, %s failures', total, success, fail);
            }
        }, 10);
    });
}
window.test = test;

function clear_scripts(event, force){
    if (force || confirm('Throw out the current script?')){
        $('.workspace:visible > *').empty();
        $('.stage').replaceWith('<div class="stage"></div>');
    }
}
$('.clear_scripts').click(clear_scripts);
$('.goto_script').click(function(){$('#accordion')[0].scrollIntoView();});
$('.goto_stage').click(function(){$('.stage')[0].scrollIntoView();});
$('.clear_canvas').click(function(){$('.stage').replaceWith('<div class="stage"></div>');});
// Load and Save Section

function scripts_as_object(){
    var blocks = $('.workspace:visible .scripts_workspace > .wrapper');
    if (blocks.length){
        return blocks.map(function(){return $(this).block_description();}).get();
    }else{
        return [];
    }   
}

function save_current_scripts(){
    show_workspace();
    $('#accordion')[0].scrollIntoView();
    localStorage['__current_scripts'] = JSON.stringify(scripts_as_object());
}
$(window).unload(save_current_scripts);


function save_named_scripts(){
    var title = $('#script_name').val();
    var description = $('#script_description').val();
    var date = Date.now();
    if (title){
        if (localStorage[title]){
            if (!confirm('A script with that title exist. Overwrite?')){
                return;
            }
        }
        localStorage[title] = JSON.stringify({
            title: title,
            description: description,
            date: date,
            scripts: scripts_as_object()
        });
        $("#save_dialog").dialog("close");
    }else   
        alert("You must enter a name");
}

function export_named_scripts(){
    console.log("here");
    var title = $('#script_name').val();    
    var description = $('#script_description').val();
    var date = Date.now();
    if (title){
		var exp = JSON.stringify({
			title: title,
			description: description,
			date: date,
			scripts: scripts_as_object()
		});
		console.log("EXP: "+exp);
		$("#save_dialog").dialog("close");
		$('#exp').dialog("open");
		$('#exp textarea').html(exp);
    }
    else
    alert("You must enter a name");
}
    
function restore_from_export(){
    var script = $('#imp textarea').val();
    console.log(script);
    $('#imp').dialog("close");
    clear_scripts();

    var ps = JSON.parse(script);
    console.log(ps.scripts);

    load_scripts_from_object(ps.scripts); 
}

function toggle_description(event){
    $(this).siblings('.description').toggleClass('hidden');
}

function populate_and_show_restore_dialog(){
    var list = $('#script_list');
    var script_obj;
    var idx, value, key, script_li;
    for (idx = 0; idx < localStorage.length; idx++){
        key = localStorage.key(idx);
        if (key === '__current_scripts') continue;
        value = localStorage[key];
        script_obj = JSON.parse(value);
        if (script_obj.description){
            script_li = $('<li><span class="title hasdesc">' + script_obj.title + '</span><button class="restore action">Restore</button><button class="delete action">Delete</button><br /><span class="timestamp">Saved on ' + new Date(script_obj.date).toDateString() + '</span><p class="description hidden">' + script_obj.description + '<p></li>');
        }else{
            script_li = $('<li><span class="title">' + script_obj.title + '</span><button class="restore action">Restore</button><button class="delete action">Delete</button><br /><span class="timestamp">Saved on ' + new Date(script_obj.date).toDateString() + '</span></li>');
        }
        script_li.data('scripts', script_obj.scripts); // avoid re-parsing later
        list.append(script_li);
    }
	$("#script_list button").button();
    $('#restore_dialog').dialog("open");
}

var allDemos = {};

function populate_demos_dialog(demos){
    var list = $('#demo_list');
    var idx, value, key, script_li;
    $.each(demos, function(){
        allDemos[this.title] = this.scripts;
        if (this.description){
            script_li = $('<li><span class="title">' + this.title + ' </span><button class="load action">Load</button><button class="show_description action">Description</button><p class="description hidden">' + this.description + '<p></li>');
        }else{
            script_li = $('<li><span class="title">' + this.title + ' </span><button class="load action">Load</button></li>');
        }
        script_li.data('scripts', this.scripts); // avoid re-parsing later
        list.append(script_li);
    });
	$("#demo_list button").button();
}

function restore_named_scripts(event){
    clear_scripts();
    load_scripts_from_object($(this).closest('li').data('scripts'));
    $("#restore_dialog").dialog('close');
}

function restore_demo_scripts(event){
    clear_scripts();
    load_scripts_from_object($(this).closest('li').data('scripts'));
    $('#demos_dialog').dialog("close");
}
function restore_demo_by_name(name){
    clear_scripts();
    load_scripts_from_object(allDemos[name]);
}
function delete_named_scripts(event){
    if (confirm('Are you sure you want to delete this script?')){
        var title = $(this).siblings('.title').text();
        $(this).parent().remove();
        console.log('remove %s', title);
        localStorage.removeItem(title);
    }
}

$("#vartype").change(function(){
    var type = $('#vartype option:selected').val();
    console.log(type);
    $('.valform').addClass('hidden'); 
    $('#'+type+'form').removeClass('hidden');
});

function add_var(){
    var varname = $("#varname").val();
    var vartype = $("#vartype").val();
    var varklass = $("#vartype").text();
    var varvalue;
    switch(vartype){
        case 'string':
            varvalue = '"'+$("#stringval").val()+'"';
            break;
        case 'number':
            varvalue = $("#numberval").val();
            break;
        case 'boolean':
            varvalue = $("#booleanval").val();
            break;
        case 'shape':
            varvalue = '{ x: '+$("#shapex").val()+', y: '+$("#shapey").val()+ ', w: '+$("#shapew").val()+', h: '+$("#shapeh").val()+' }';
            break;
        case 'point':
            varvalue = '{ x: '+$("#pointx").val()+', y: '+$("#pointy").val()+ ' }';
            break;
        case 'imagedata':
            varvalue = 'local.ctx.createImageData('+$("#imagedataw").val()+','+$("#imagedatah").val()+')';
            break;
        case 'pixel':
            varvalue = '{ r: '+$("#pixelr").val()+', g: '+$("#pixelg").val()+ ', b: '+$("#pixelb").val()+' }';
            break;
        default:
            varvalue = 0;
            break;
    }
    if(vartype!='string'){

    }
    else{
        initSpec = {
            label: 'create ' + vartype + ' ' + varname + ' assigned to ' + varvalue,
            script: 'var ' + varname + '=' + varvalue + ';'
        };
        valSpec = {
            label: varname,
            'type': vartype,
            script: varname
        };
        changeSpec = {
            label: 'set [any] to [any]',
            script: '{{1}} = {{2}}' 
        }
        genVarBlock(varklass, initSpec);
        genVarBlock(varklass, valSpec);
        genVarBlock(varklass, changeSpec);
    }
}

/*$('#save_dialog .save').click(save_named_scripts);
$('#save_dialog .export').click(export_named_scripts);
$('#save_dialog .cancel').click(reset_and_close_save_dialog);
$('.save_scripts').click(function(){$('#save_dialog').bPopup();});*/

$('.save_scripts').click(function(){$('#save_dialog').dialog("open");});

$('.restore_scripts').click( populate_and_show_restore_dialog );
/*$('#restore_dialog .cancel').click(reset_and_close_restore_dialog);
$('#restore_dialog .exp').click(restore_from_export);*/
$('#restore_dialog').delegate('.restore', 'click', restore_named_scripts)
                    .delegate('.title', 'click', toggle_description)
                    .delegate('.delete', 'click', delete_named_scripts);

$('#demos_dialog').delegate('.load', 'click', restore_demo_scripts)
                  .delegate('.show_description', 'click', toggle_description);
				  
//$('#demos_dialog .cancel').click(function(){$('#demos_dialog').bPopup().close();});
$('.demo_scripts').click(function(){$('#demos_dialog').dialog("open");});
//$('.layout_blocks').click(layout_blocks);

function layout_blocks(){
    var blocks = $('.workspace:visible .scripts_workspace > .wrapper');
    blocks.each(function(idx){
        var stagger = (idx + 1) * 30;
        $(this).css({position:'absolute', left: stagger, top: stagger});
    });
}

function load_scripts_from_object(blocks){
    var workspace = $('.workspace:visible .scripts_workspace');
    $.each(blocks, function(idx, value){
        console.log('restoring block %s', idx);
        var block = Block(value);
        workspace.append(block);
        block.css({position: 'relative', left: 0, top: 0, display: 'block'});
        block.trigger('add_to_workspace');
        $('.scripts_workspace').trigger('add');

    });
}

window.load_current_scripts = function(){
    if (localStorage.__current_scripts){
        var blocks = JSON.parse(localStorage['__current_scripts']);
        if (blocks.length){
            console.log('restoring %s blocks', blocks.length);
            load_scripts_from_object(blocks);
        }
    }
}
// $(document).ready(load_current_scripts);

// Tab UI

// UI Section

$("input[name='scriptview']").change(function () {
	//alert(""+($("#sblock").attr('checked'))+" "+($("#stext").attr('checked')));
    var self = $(this);
    $('.tab_bar .selected').removeClass('selected');
    self.addClass('selected');
    $('.workspace:visible > div:visible').hide();
	if($("#sblock").attr('checked') === 'checked'){
        $('.workspace:visible .scripts_workspace').show();
	}
	else if($("#stext").attr('checked') === 'checked'){
        $('.workspace:visible .scripts_text_view').show();
        update_scripts_view();
	}
}).change();

// Expose this for dragging and saving functionality
window.show_workspace = function(){
    $('.workspace:visible .scripts_text_view').hide();
    $('.workspace:visible .scripts_workspace').show();
}	

this.blocknames = new Array();
// Build the Blocks menu, this is a public method
function menu(title, specs) {
	var klass = title.toLowerCase();
	var body = $('<section class="submenu"></section>');
	var select = $('<h3 class="select"><a href="#">' + title + '</a></h3>').appendTo(body);
	var options = $('<div class="option"></div>').appendTo(body);

	$.each(specs, function(idx, spec) {
		if (spec !== undefined) {
			spec.klass = klass;
			var name = spec.label;
			//changes the name to look "nicer"
			while (name.indexOf('[') != -1) {
				name = name.replace('[', '(');
				name = name.replace(']', ')');
			}
			while (name.indexOf('#') != -1) {
				name = name.replace('#', '');
			}
			options.append(Block(spec));
			blocknames.push({
				label : name,
				category : spec.klass
			});
			nameMap[name] = Block(spec);
			//nameMap is used in search.js
		}
	});
	$('#accordion').append(body);
	return;
}

function genVarBlock(title, spec) {
    var options = $('#varlist');
    var klass = title.toLowerCase();
    if (spec !== undefined) {
        spec.klass = klass;
        var name = spec.label;
        //changes the name to look "nicer"
        while (name.indexOf('[') != -1) {
            name = name.replace('[', '(');
            name = name.replace(']', ')');
        }
        while (name.indexOf('#') != -1) {
            name = name.replace('#', '');
        }
        var newblock = Block(spec);
        options.append(newblock);
        blocknames.push({
            label : name,
            category : spec.klass
        });
        nameMap[name] = newblock;
    }
}

window.menu = menu;
window.blocknames = this.blocknames;

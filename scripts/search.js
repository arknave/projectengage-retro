/**
 * @author Jonas
 */
this.nameMap = new Array();
/*TODO
* 1.Trigger on pressing the enter key
* 2.Trigger through a binding rather than a button call
* 3.Names need to look nicer
*/
/**Adds a block based on it's "name", as defined in the blocknames array in workspace.js.
 *
 * @param {Object} name
 */
function search(name) {
	var block = nameMap[name];
	if (block)
		add_block(block);
}

//TODO optimize, largely copy and pasted from drag.js
function add_block(block) {
	block.css({
		position : 'relative',
		top : 0,
		left : 0,
		display : 'block'
	});
	var drag_target = block;
	//var drop_target = null;
	var start_parent = block.parent();
	var target_canvas = $('div.scripts_workspace');
	//TODO update along with drag.js when workspace is switched
	var drop_cursor;
	var self, top, middle, bottom, x = drag_target.position().top;
	drop_cursor = $('<div class="drop_cursor"></div>');
	target_canvas.prepend(drop_cursor);
	drop_cursor.show();
	target_canvas.children('.wrapper').each(function(idx) {
		self = $(this);
		top = self.position().top
		bottom = top + self.outerHeight();
		middle = (bottom - top) / 2 + top;
		if (x < middle) {
			self.before(drop_cursor);
			return false;
		} else {
			self.after(drop_cursor);
		}
	});

	drop_cursor.before(drag_target);
	drop_cursor.remove();
	drop_cursor = null;
	drag_target.css({
		position : 'relative',
		top : 0,
		left : 0,
		display : 'block'
	});
	drag_target.trigger('add_to_workspace');
	$('.scripts_workspace').trigger('add');
}

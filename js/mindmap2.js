(function(){
	'use strict';

	// Check browser support
	if (!Pablo.isSupported){
		return;
	}

	var HUB_X = 20,
		HUB_Y = '50%',
		HUB_PADDING_X = 8,
		HUB_PADDING_Y = 5,
		HUB_CORNER_R = 5;


	function MindMap(htmlContainer){
		this.nodes = {};
		
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		// Create SVG root
		this.svg = Pablo(htmlContainer).root({
			width: this.width,
			height: this.height
		});
	}

	MindMap.prototype = {
		askChild: function(parent){
			var title = this.trim(prompt('What\'s the text?'));
			if (title){
				if (parent){
					this.drawChild(parent, title);
				}
				else {
					this.drawHub(title);
				}
			}
			return this;
		},

		drawHub: function(title){
			var node, text, bbox, ellipse, node;

			node = this.svg.g()
				.addClass('node')
				.addClass('hub');

			text = node.text({
				x: HUB_X,
				y: HUB_Y
			}).content(title);

			bbox = text[0].getBBox();

			node.prepend('rect', {
				x: bbox.x - HUB_PADDING_X,
				y: bbox.y - HUB_PADDING_Y,
				width: bbox.width + HUB_PADDING_X * 2,
				height: bbox.height + HUB_PADDING_Y * 2,
				rx: HUB_CORNER_R
			});

			// Add container for child nodes
			node.g().addClass('nodes');
			this.select(node);

			return this;
		},

		hub: function(){
			return this.svg.find('.hub');
		},

		randomInt: function(length){
	        return Math.ceil((length || 2) * Math.random()) - 1;
	    },

	    getNodes: function(node){
	    	return node.find('.nodes').eq(0);
	    },

	    getParentNode: function(node){
	    	return node.parent().parent();
	    },

	    pathData: function(parentBBox, childBBox, parentIsHub){
	    	return  'M' + (parentBBox.x + parentBBox.width + (parentIsHub ? HUB_PADDING_X : 0)) + ' ' +
					      (parentBBox.y + parentBBox.height / (parentIsHub ? 2 : 1)) +
					'L' + childBBox.x + ' ' +
						  (childBBox.y + childBBox.height) +
					'L' + (childBBox.x + childBBox.width) + ' ' +
						  (childBBox.y + childBBox.height);
	    },

		drawChild: function(parent, title){
			var node, nodes, text, path, parentBBox, parentText, childBBox, parentIsHub;

			parentText = parent.find('text').eq(0);
			parentBBox = parentText[0].getBBox();
			nodes = this.getNodes(parent);
			node = nodes.g().addClass('node');

			text = node.text({
				x: parentBBox.x + parentBBox.width + 80,
				y: this.randomInt(this.height - 20)
			}).content(title);
			childBBox = text[0].getBBox();
			parentIsHub = parent.hasClass('hub');

			path = node.path({
				d:  this.pathData(parentBBox, childBBox, parentIsHub)
			});

			// Add container for child nodes
			node.g().addClass('nodes');
			this.select(node);

			return this;
		},

		calculateNextPos: function(parent){
			var PI = Math.PI,
				minTheta = PI / 20,
				distance = 80,
				startAngles = [PI / 2, PI - minTheta, minTheta],
				children = this.getNodes(parent).children(),
				hubBBox = this.hub()[0].getBBox(),
				maxDiff, diff, angle, sortedChildren;

			if (children.length < startAngles.length){
				angle = startAngles[children.length];
			}

			else {
				maxDiff = 0;
				sortedChildren = this.sortByAngle(children);

				children.slice(0, children.length-1)
					.each(function(el, i){
						var node1 = Pablo(el),
							node2 = Pablo(children.get(i+1)),
							angle1 = this.getAngle(node1),
							angle2 = this.getAngle(node2);

						diff = angle1 - angle2;

						if (maxDiff + 0.000001 < diff){
							maxDiff = diff;
							angle = (angle1 + angle2) / 2;
						}
					});
			}

			return {
				x: hubBBox.x + Math.sin(angle) * distance,
				y: hubBBox.y + Math.cos(angle) * distance
			};
		},

		selected: function(){
			return this.svg.find('.selected');
		},

		select: function(node){
			if (node.hasClass('node')){
				this.selected().removeClass('selected');
				node.addClass('selected');
			}
			return this;
		},

		trim: function(str){
			return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
		},

		getX: function(node){
			return Number(node.find('text').eq(0).attr('x'));
		},

		getY: function(node){
			return Number(node.find('text').eq(0).attr('y'));
		},

		sortByY: function(nodes){
			var mindmap = this;
			return Pablo(
				nodes.toArray().sort(function(a, b){
					return mindmap.getY(Pablo(a)) > mindmap.getY(Pablo(b));
				})
			);
		},

		getAngle: function(node){
			var x = this.getX(node),
				y = this.getY(node),
				hubBBox = this.hub()[0].getBBox();

			// TODO: factor in the quadrant
			return Math.atan2((hubBBox.x + x) * (hubBBox.y + y));
		},

		sortByAngle: function(nodes){
			var mindmap = this;
			return Pablo(
				nodes.toArray().sort(function(a, b){
					return mindmap.getAngle(Pablo(a)) > mindmap.getAngle(Pablo(b));
				})
			);
		},

		onkeydown: function(event){
			// See http://unixpapa.com/js/key.html
			var code = event.which,
				selected, parent, toSelect, children, sortedChildren, siblings, sortedSiblings, index;

			if (code === 9 || code === 13 || code >= 37 || code <=40){
				selected = this.selected();
				parent = this.getParentNode(selected);
				children = this.getNodes(selected).children();
				siblings = selected.siblings();
				event.preventDefault();
			}

			switch (code){
				// Tab key: create a child
				case 9:
				this.askChild(selected);
				break;

				// Return key: create a sibling
				case 13:
				this.askChild(parent.length ? parent : selected);
				break;

				// Left arrow: select parent
				case 37:
				toSelect = parent;
				break;

				// Right arrow: select top child
				case 39:
				sortedChildren = this.sortByY(children);
				toSelect = sortedChildren.first();
				break;

				// Up arrow: select sibling above
				case 38:
				sortedSiblings = this.sortByY(siblings);
				index = sortedSiblings.indexOf(selected);
				toSelect = sortedSiblings.eq(index - 1);

				// Wrap around to the bottom sibling
				if (!toSelect.length){
					toSelect = sortedSiblings.last();
				}
				break;

				// Down arrow: select sibling below
				case 40:
				sortedSiblings = this.sortByY(siblings);
				index = sortedSiblings.indexOf(selected);
				toSelect = sortedSiblings.eq(index + 1);

				// Wrap around to the top sibling
				if (!toSelect.length){
					toSelect = sortedSiblings.first();
				}
				break;
			}

			// Select
			if (toSelect){
				this.select(toSelect);
			}
			
			return this;
		}
	};

	
	/////


	var mm = new MindMap('#mindmap');
	//mm.askHub();

	mm.drawHub('Trees');
	mm.drawChild(mm.hub(), 'Birch');
	mm.drawChild(mm.hub(), 'Oak');
	window.mm = mm;

	window.addEventListener('keydown', function(event){
		mm.onkeydown(event);
	}, false);



///////////

return;



var PI = Math.PI,
	minTheta = PI / 20,
	originX = 300,
	originY = 300,
	r = 300,
	startAngles = [PI / 2, PI - minTheta, minTheta],
	angles = [];

// Draw circle
mm.svg.empty().circle({cx:300, cy:300, r:r, fill:'none', stroke:'black'});

function line(x, y){
	return mm.svg.line({x1:r, y1:r, x2:x, y2:y, stroke:'black'});
}

function drawAngle(){
	var maxDiff, maxDiffIndex, angle, diff, i, length;

	if (angles.length < startAngles.length){
		angle = startAngles[angles.length];
	}
	else {
		maxDiff = 0;
		for (i=0, length=angles.length; i<length-1; i++){
			diff = angles[i] - angles[i+1];

			if (maxDiff + 0.000001 < diff){
				maxDiff = diff;
				maxDiffIndex = i;
			}
		}
		angle = (angles[maxDiffIndex] + angles[maxDiffIndex+1]) / 2;
	}

	angles.push(angle);
	angles.sort().reverse();
	line(originX + Math.sin(angle) * r, originY + Math.cos(angle) * r);
}

// TODO: use originX and y to translate groups

drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();

}());
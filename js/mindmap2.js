(function(){
	'use strict';

	var data = {
		title: 'trees',
		nodes: [
			{
				title: 'oak',
				nodes: [
					{title: 'acorn'},
					{title: 'leaf'},
					{title: 'royal oak'}
				]
			},
			{
				title: 'birch',
				nodes: [
					{
						title:'silver',
						nodes:[
							{title: 'gold'},
							{title: 'platinum'}
						]
					},
					{title:'swedish'}
				]
			}
		]
	};

	/////

	// Check browser support
	if (!Pablo.isSupported){
		return;
	}

	var HUB_PADDING_X = 8,
		HUB_PADDING_Y = 5,
		HUB_CORNER_R = 5;


	function MindMap(htmlContainer){
		this.nodes = [];
		
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		// Create SVG root
		this.svg = Pablo(htmlContainer).root({
			width: this.width,
			height: this.height
		});
	}

	MindMap.prototype = {
		nodes: null,
		selected: null,

		askHub: function(){
			var title = prompt('What\'s the concept?');
			if (title){
				this.drawHub(title);
			}
			return this;
		},

		drawHub: function(title){
			var dom, text, bbox, ellipse, node;

			dom = this.svg.g().addClass('node');
			text = dom.text({
				x: 20,
				y: '50%'
			}).content(title);

			bbox = text[0].getBBox();

			dom.prepend('rect', {
				x: bbox.x - HUB_PADDING_X,
				y: bbox.y - HUB_PADDING_Y,
				width: bbox.width + HUB_PADDING_X * 2,
				height: bbox.height + HUB_PADDING_Y * 2,
				rx: HUB_CORNER_R
			});

			/*
			ellipse = dom.prepend('ellipse', {
				cx: bbox.x + bbox.width / 2,
				cy: bbox.y + bbox.height / 2,
				rx: bbox.width,
				ry: bbox.height
			});
			*/

			node = {dom:dom, nodes:[]};
			this.nodes = node;
			this.selected = node;

			return this;
		},

		askChild: function(parent){
			var title = prompt('What\'s the text?');
			if (title){
				this.drawChild(parent, title);
			}
			return this;
		},

		drawPath: function(from, to){
			var fromBBox = from[0].getBBox(),
				toBBox = to[0].getBBox();

			return Pablo.path({
				d:  'M' + (fromBBox.x + fromBBox.width + HUB_PADDING_X) + ' ' +
					      (fromBBox.y + fromBBox.height / 2) +
					'L' + toBBox.x + ' ' +
						  (toBBox.y + toBBox.height) +
					'L' + (toBBox.x + toBBox.width) + ' ' +
						  (toBBox.y + toBBox.height)
			});
		},

		randomInt: function(length){
	        return Math.ceil((length || 2) * Math.random()) - 1;
	    },

		drawChild: function(parent, title){
			var dom, node, text, path, parentBBox, parentText;

			parentText = parent.dom.find('text').eq(0);
			parentBBox = parentText[0].getBBox();
			dom = parent.dom.g().addClass('node');

			text = dom.text({
				x: parentBBox.x + parentBBox.width + 80,
				y: this.randomInt(this.height - 20)
			}).content(title);

			path = this.drawPath(parentText, text).appendTo(dom);
			node = {dom:dom};
			parent.nodes.push(node);

			return this;
		},

		onkeypress: function(event){
			var charCode = event.which;

			// Return key
			if (charCode === 13){
				this.askChild(this.selected);
			}
			return this;
		}
	};

	
	/////


	var mm = new MindMap('#mindmap');
	//mm.askHub();

	mm.drawHub('Trees');
	mm.drawChild(mm.selected, 'birch');

	window.addEventListener('keypress', function(event){
		mm.onkeypress(event);
	}, false);


	/////



	/*
	function drawLabel(container, concept){
		var label = container.text({
			x:'50%',
			y:'50%',
			'text-anchor':'middle',
			'alignment-baseline': 'middle',
			'font-size':20
		});
		return label.content(concept.title);
	}

	function drawEllipse(container){
		return container.ellipse({
			cx:'50%',
			cy:'50%',
			rx:40,
			ry:20,
			fill:'none',
			stroke:'red',
			'stroke-width':5
		});
	}

	function drawConcept(concept, index, nodes){
		var container = map.g(),
			height = 500,
			translateX, translateY;

		drawLabel(container, concept);
		drawEllipse(container);

		console.log(concept.title, index, nodes, nodes && nodes.length);
		if (nodes){
			translateY = (height / (nodes.length - 1)) * index - height / 2;
			console.log(translateY);
			container.transform('translate', (index * 100) + ' ' + translateY);
		}
		
		if (concept.nodes){
			concept.nodes.forEach(drawConcept);
		}
	}

	function drawConcept2(concept, depth, x, y){
		var container = map.g();

		drawLabel(container, concept);
		drawEllipse(container);

		container.transform('translate', x + ' ' + y);

		console.log(concept.title, depth, x, y);
		if (concept.nodes){
			drawNodes(concept.nodes, depth + 1);
		}
	}

	function drawNodes(nodes, depth){
		var height = 500,
			x = depth * 150,
			distanceY = height / (nodes.length - 1);

		nodes.forEach(function(concept, index){
			var y = distanceY * index - height / 2 || 0;
			drawConcept2(concept, depth, x, y);
		});
	}

	function drawConceptR(root, concept, depth, x, y, rotate, rotateOriginX, rotateOriginY){
		var container = root.g(),
			label = drawLabel(container, concept),
			ellipse = drawEllipse(container);

		if (rotate){
			container.transform('rotate', rotate + ' ' + rotateOriginX + ' ' + rotateOriginY);
			var labelCenter = getCenter(label);
			Pablo([label, ellipse])
				.transform('rotate', -rotate + ' ' + labelCenter.x + ' ' + labelCenter.y);

			// TODO: rotate label if parent has been rotated!
		}
		container.transform('translate', x + ' ' + y);

		console.log(concept.title, depth, x, y, rotate, rotateOriginX, rotateOriginY);
		if (concept.nodes){
			depth ++;
			drawNodesR(container, concept.nodes, depth);
		}
	}

	function getCenter(elem){
		var el = (elem || Pablo('g.map').find('text'))[0],
			bbox = el.getBBox(),
			x = bbox.x + (bbox.width / 2),
			y = bbox.y + (bbox.height / 2);

		return {x:x, y:y};
	}

	function drawNodesR(root, nodes, depth){
		var height = 200,
			x = depth * 100,
			numNodes = nodes.length,
			distanceY = height / (numNodes - 1),
			doRotation = depth === 1 && numNodes > 1,
			center, rotationPerNode, rotate, rotateOriginX, rotateOriginY;

		if (doRotation){
			rotationPerNode = 360 / numNodes;
			center = getCenter();
			rotateOriginX = center.x;
			rotateOriginY = center.y;
		}

		nodes.forEach(function(concept, index){
			var y = distanceY * index - height / 2 || 0;

			if (doRotation){
				rotate = rotationPerNode * index;
				y = 0;
			}
			drawConceptR(root, concept, depth, x, y, rotate, rotateOriginX, rotateOriginY);
		});
	}

	function drawMap(data){
		drawNodesR(map, [data], 0);
	}

	drawMap(data);
	*/
	
}());
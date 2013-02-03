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

	var root = Pablo('#mindmap').root({width:'100%', height:'100%'}),
		map = root.g().addClass('map');

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
	
}());
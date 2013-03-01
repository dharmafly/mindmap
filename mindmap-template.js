(function(window, Pablo, MindMap){
	'use strict';

	function MindmapNode(nodeData){
		
	}

	function createNodeView(nodeData, settings){
		var node, rect, text, path;

		// Append a <g> group element to the parent to represent the 
        // mindmap node in the DOM
        node = Pablo.g({
			/* Alternatively, the `class` attribute could have be set with
			   `node.addClass('node')`
			*/
			'class': 'node',
			'data-id': nodeData.id
		});

		// Append a <rect> rectangle element
        rect = node.rect({rx: this.CORNER_R});

        // Append a <text> element, with padding
        text = node.text({
            x: this.PADDING_X,
            y: this.FONTSIZE,
            'font-size': this.FONTSIZE
        });

        // Create a <path> element to visually connect the 
        // parent and node. Its coordinates are set by the 
        // `updatePosition` method. We prepend it so that 
        // it appears beneath the parent's rectangle.
        path = Pablo.path().prependTo(parent);

        // Extend the cached lookup object to give quick access to the elements
        Pablo.extend(nodeData, {node:node, rect:rect, text:text, path:path});

		node.append([
			'path',

			Pablo('rect', {
				rx: settings.CORNER_R
			}),
			
			Pablo('text', {
	            x: settings.PADDING_X,
	            y: settings.FONTSIZE,
	            'font-size': settings.FONTSIZE
			})
		]);
	}

	Pablo.template('mindmap-node', createNodeView);

}(window, window.Pablo, window.MindMap));


/////

	MindMap.createElements = function(nodeData, parent){
        var node, rect, text, path;

        // Append a <g> group element to the parent to represent the 
        // mindmap node in the DOM
        node = parent.g({'data-id': nodeData.id}).addClass('node');

        // Append a <rect> rectangle element
        rect = node.rect({rx: this.CORNER_R});

        // Append a <text> element, with padding
        text = node.text({
            x: this.PADDING_X,
            y: this.FONTSIZE,
            'font-size': this.FONTSIZE
        });

        // Create a <path> element to visually connect the 
        // parent and node. Its coordinates are set by the 
        // `updatePosition` method. We prepend it so that 
        // it appears beneath the parent's rectangle.
        path = Pablo.path().prependTo(parent);

        // Extend the cached lookup object to give quick access to the elements
        Pablo.extend(nodeData, {node:node, rect:rect, text:text, path:path});

        return node;
    }
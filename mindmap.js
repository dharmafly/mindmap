/*global Pablo*/
/*jshint newcap:false*/
var MindMap = (function(){
    'use strict';

    function MindMap(htmlContainer){
        var mindmap = this;

        // Create SVG root
        this.svg = Pablo(htmlContainer).svg({
                // Alternatively, specify `svg {width:100%; height:100%;}`
                // in the CSS stylesheet
                width: '100%',
                height: '100%'
            })
            // Set up event handlers - see mindmap.onmousedown(), etc
            .on('mousedown mousemove mouseup mouseout', function(event){
                mindmap['on' + event.type](event);
            });

        /*
        window.addEventListener('keydown', function(event){
            var code = event.which,
                node = Pablo(event.target);

                console.log(event);
            // Backspace / delete
            if (node.hasClass('node') && code === 8 || code === 46){
                mindmap.deleteNode(node);
                event.preventDefault();
                Event.stop();
            }
        });
        */

        // Create lookup objects
        this.nodeData = {}; // data about each node

        // Add instructions message
        this.addInstructions();
    }

    MindMap.prototype = {
        NODE_PADDING_X: 8,
        NODE_PADDING_Y: 5,
        NODE_CORNER_R: 5,
        NODE_FONT_SIZE: 20,
        PATH_CURVE: 30,
        idCounter: 1,

        trim: function(str){
            return str ? str.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : '';
        },

        getId: function(node){
            return node && node.attr('data-id');
        },

        userCreate: function(x, y){
            var title = this.trim(window.prompt('What\'s the text?')),
                parentId = this.getId(this.selected);

            if (title){
                this.drawNode(parentId, x, y, title);
            }
            return this;
        },

        // Add a <text> element with instructions
        addInstructions: function(){
            this.svg.text({x:'50%', y:'50%'})
                    .addClass('instructions')
                    .content('Click anywhere to create nodes');
            return this;
        },

        // Remove the instructions <text> element
        removeInstructions: function(){
            Pablo('.instructions').remove();
            return this;
        },

        drawNode: function(parentId, x, y, title){
            var nodeId, parent, path, node, nodeData, text, textBBox;

            // Generate a new id for the node
            nodeId = this.idCounter ++;

            if (parentId){
                // Find the parent node element
                parent = this.nodeData[parentId].node;

                // Create a <path> element that will visually connect the parent and
                // node. The path's coordinates are set by the `setPosition` method.
                path = Pablo.path().prependTo(parent);
            }
            else {
                // This is the first node in the mindmap. Use the SVG root as the parent.
                parent = this.svg;

                // Remove the instructions text
                this.removeInstructions();
            }

            // Append a <g> group element to the parent to represent the 
            // mindmap node in the DOM
            node = parent.g({'data-id':nodeId}).addClass('node');

            // Create a <text> element and set its text content
            text = node.text({
                    x: this.NODE_PADDING_X,
                    y: this.NODE_FONT_SIZE,
                    'font-size': this.NODE_FONT_SIZE
                })
                .content(title);

            // Get the text's rendered dimensions
            // getBBox is a very useful native SVG DOM method
            // see also 
            textBBox = text[0].getBBox();

            // Store data about the node in a lookup object
            // `x` and `y` are set by `setPosition`
            // `width` and `height` are the <text> dimensions, plus padding
            nodeData = {
                x:      x,
                y:      y,
                node:   node,
                width:  textBBox.width  + this.NODE_PADDING_X * 2,
                height: textBBox.height + this.NODE_PADDING_Y * 2,
                parent: parentId,
                path:   path
            };
            this.nodeData[nodeId] = nodeData;

            // Prepend a <rect> rectangle element to surround the text element
            // It is prepended so that the text appears on top
            node.prepend('rect', {
                width:  nodeData.width,
                height: nodeData.height,
                rx: this.NODE_CORNER_R // rounded corners
            });

            // Select the node and set its position
            return this.select(node)
                       .setPosition(nodeId, x, y);
        },

        setPosition: function(nodeId, x, y){
            var nodeData = this.nodeData[nodeId],
                node = nodeData.node,
                parentData = this.nodeData[nodeData.parent],
                pathData;

            // Update stored data
            nodeData.x = x;
            nodeData.y = y;

            if (parentData){
                // Set the path's curve between the parent and node
                pathData = this.getPathData(parentData, nodeData);
                nodeData.path.attr('d', pathData);

                // x and y are page coordinates -> make them relative to the parent
                x -= parentData.x;
                y -= parentData.y;
            }

            // Translate the node to the new coordinates
            node.transform('translate', x, y);
            return this;
        },

        // Draw a path from the parent to the child
        // p = parentData, n = nodeData
        getPathData: function(p, n){
            var isLeft  = p.x < n.x,
                isAbove = p.y < n.y,
                x1 = isLeft ? p.width : 0,
                x2 = n.x - p.x + (isLeft ? -x1 : n.width),
                y1 = p.height / 2,
                y2 = n.y - p.y,
                curve = this.PATH_CURVE,
                xCtrl = x2 / 2 + (isLeft ? -curve : curve),
                yCtrl = y2 / 2 + (isAbove ? curve : -curve);

            return 'm' + x1 + ' ' + y1 +
                   'q' + xCtrl + ' ' + yCtrl + ',' + x2  + ' ' + y2;
        },

        select: function(node){
            // De-selected currently selected node
            if (this.selected){
                this.selected.removeClass('selected');
            }

            // Store node as `mindmap.selected` property
            this.selected = node
                // Add a CSS class
                .addClass('selected')
                // Bring to front, to prevent the node being dragged behind another node
                .appendTo(node.parent());

            return this;
        },

        nearestNode: function(el){
            var node = Pablo(el);
            return node.hasClass('node') ?
                node : node.parents('.node').first();
        },

        onmousedown: function(event){
            var node, x, y;

            // left button click
            if (event.which === 1){
                node = this.nearestNode(event.target);
                x = event.pageX;
                y = event.pageY;

                if (node.length){
                    this.select(node);
                    this.dragStart(node, x, y);
                }
                else {
                    this.userCreate(x, y);
                }
            }
        },

        onmousemove: function(event){
            if (this.dragging){
                this.drag(event.pageX, event.pageY);
            }
        },

        onmouseup: function(){
            if (this.dragging){
                this.dragStop();
            }
        },

        // When the mouse leaves the SVG element, stop dragging
        // E.g. this prevents the mouse dragging out of the window, the mouse
        // button released _outside_ the window and returning, still dragging
        onmouseout: function(event){
            var to, isSvg;

            if (this.dragging){
                // Which element is the mouse entering?
                to = event.relatedTarget;

                // Is that element the SVG root or one of its children?
                isSvg = to && (to === this.svg[0] || to.ownerSVGElement === this.svg[0]);

                // Stop dragging when the mouse leaves the SVG element
                if (!isSvg){
                    this.dragStop();
                }
            }
        },

        dragStart: function(node, x, y){
            var nodeId = this.getId(node),
                nodeData = this.nodeData[nodeId];

            // Store data about the node being dragged
            this.dragging = {
                id: nodeId,
                offsetX: x - nodeData.x,
                offsetY: y - nodeData.y
            };
            return this;
        },

        drag: function(x, y){
            var d = this.dragging;
            return this.setPosition(d.id, x - d.offsetX, y - d.offsetY);
        },

        dragStop: function(){
            this.dragging = null;
            return this;
        }
    };

    
    /////



    // Check browser support
    if (Pablo.isSupported){
        var mm = new MindMap('#mindmap');

        mm.drawNode(null, 220, 300, 'Trees')
          .drawNode(1, 100, 100, 'Birch')
          .drawNode(1, 150, 500, 'Oak')
          .drawNode(3, 10, 400, 'Larch')
          .drawNode(1, 310, 230, 'Pine');
          
        window.mm = mm;
    }


    /////


    return MindMap;
}());
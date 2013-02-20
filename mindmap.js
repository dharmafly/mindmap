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

        // Create a simple object cache in memory
        this.cache = {}; // data about each node

        // Add instructions message
        this.addInstructions();
    }

    MindMap.prototype = {
        PADDING_X: 8,
        PADDING_Y: 5,
        CORNER_R: 5,
        FONTSIZE: 20,
        PATH_CURVE: 30,
        idCounter: 1,

        trim: function(str){
            return str ? str.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : '';
        },

        getId: function(node){
            return node && node.attr('data-id');
        },

        // Add a <text> element with instructions
        addInstructions: function(){
            this.svg.text({x:'50%', y:'50%'})
                    .addClass('instructions')
                    .content('Click anywhere to create nodes\nClick a node to select');
            return this;
        },

        // Remove the instructions <text> element
        removeInstructions: function(){
            this.svg.find('.instructions').remove();
            return this;
        },

        // Ask the user what text to put in a new node
        userCreate: function(x, y){
            var title = this.trim(window.prompt('What\'s the text?')),
                parentId = this.getId(this.selected);

            if (title){
                this.drawNode(parentId, x, y, title);
            }
            return this;
        },

        drawNode: function(parentId, x, y, title){
            var nodeId, parent, path, node, nodeData, text, rect, textBBox;

            // Generate a new id for the node
            nodeId = this.idCounter ++;

            // Remove the instructions text
            if (!parentId) {
                this.removeInstructions();
            }

            // Store data about the node in a lookup object
            nodeData = this.cache[nodeId] = {
                id:nodeId, parentId:parentId,
                x:x, y:y,
                title:title
            };



            // Select the node, update its text and position
            return this.createNodeElements(nodeData)
                       .select(nodeId)
                       .updateText(nodeData, title)
                       .updatePosition(nodeData, x, y);
        },

        createNodeElements: function(nodeData){
            var parentId = nodeData.parentId,
                parentData = this.cache[parentId],
                parent, path, node, rect, text;

            // If there's no parent (e.g. for the first node), append to the SVG root
            parent = parentData ?
                parentData.node : this.svg;

            // Append a <g> group element to the parent to represent the 
            // mindmap node in the DOM
            node = parent.g({'data-id': nodeData.id}).addClass('node');

            // Append a <rect> rectangle element, with rounded corners
            rect = node.rect({rx: this.CORNER_R});

            // Append a <text> element, with padding
            text = node.text({
                x: this.PADDING_X,
                y: this.FONTSIZE,
                'font-size': this.FONTSIZE
            });

            // Create a <path> element to visually connect the parent and node.
            // Its coordinates are set by the `updatePosition` method.
            // We prepend it so that it appears beneath the parent's rectangle.
            path = parentId ?
                Pablo.path().prependTo(parent) : null;


            // Extend the cached lookup object to give quick access to the elements
            Pablo.extend(nodeData, {node:node, rect:rect, text:text, path:path});

            return this;
        },

        updateText: function(nodeData, title){
            var text = nodeData.text,
                rect = nodeData.rect,
                bbox, nodeDimensions;

            // Set the text element's contents
            text.content(title);

            // Get the text's rendered dimensions. `getBBox()` is a native SVG DOM method
            bbox = text[0].getBBox();
            
            // Add padding for the rectangle's dimensions and update the node data
            nodeDimensions = {
                width:  bbox.width + this.PADDING_X * 2,
                height: bbox.height + this.PADDING_Y * 2
            };

            // Update the cached data and apply to the <rect> element
            Pablo.extend(nodeData, nodeDimensions);
            rect.attr(nodeDimensions);

            return this;
        },

        updatePosition: function(nodeData, x, y){
            var node = nodeData.node,
                parentData = this.cache[nodeData.parentId],
                pathData;

            // Update stored data
            nodeData.x = x;
            nodeData.y = y;

            // x and y are initially page coordinates -> make them relative to the parent
            if (parentData){
                x -= parentData.x;
                y -= parentData.y;
            }

            // Translate the node to the new coordinates
            node.transform('translate', x, y);

            // Update the path drawn between the parent and node
            return this.updatePath(parentData, nodeData);
        },

        updatePath: function(parentData, nodeData){
            // Get the <path> element
            var path = nodeData.path,
                pathData;

            if (path){
                // Calculate the curve between the parent and node
                pathData = this.getPathData(parentData, nodeData)

                // Set the element's `d` (data) attribute with the path data
                path.attr('d', pathData);
            }
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

        select: function(nodeId){
            var node = this.cache[nodeId].node;

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
            var nodeId, node, x, y;

            // left button click
            if (event.which === 1){
                node = this.nearestNode(event.target);
                x = event.pageX;
                y = event.pageY;

                if (node.length){
                    nodeId = node.attr('data-id');
                    this.select(nodeId);
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
                nodeData = this.cache[nodeId];

            // Store data about the node being dragged
            // The offset is the distance between the node's x,y origin and the mouse cursor
            this.dragging = {
                nodeData: nodeData,
                offsetX:  x - nodeData.x,
                offsetY:  y - nodeData.y
            };
            return this;
        },

        drag: function(x, y){
            // Retrieve the stored data about the node being dragged
            var d = this.dragging;

            // Remove the offset between the node's x,y origin and the mouse cursor
            x -= d.offsetX;
            y -= d.offsetY;

            // Update the node's position
            return this.updatePosition(d.nodeData, x, y);
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
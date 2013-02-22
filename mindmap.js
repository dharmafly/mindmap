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
            width: window.innerWidth,
            height: window.innerHeight
        });

        // Create a simple object cache in memory
        this.cache = {}; // data about each node

        // Add instructions message
        this.addInstructions();

        // Setup event handlers for user interaction
        this.setupEvents();
    }

    MindMap.prototype = {
        PADDING_X: 8,
        PADDING_Y: 5,
        CORNER_R: 7,
        PATH_CURVE: 30,
        FONTSIZE: 20,
        idCounter: 1,

        getId: function(node){
            return node && node.attr('data-id');
        },

        // Ask the user what text to put in a new node
        userCreate: function(x, y){
            var title = window.prompt("What's the text?") || '',
                parent = this.selected || this.svg.find('.node').eq(0),
                parentId = this.getId(parent);

            title = title.trim();
            if (title){
                this.drawNode(parentId, x, y, title);
            }
            return this;
        },

        getRelativeCoords: function(parentId, pageX, pageY){
            var parentData = this.cache[parentId],
                dx = pageX,
                dy = pageY;

            while (parentData){
                dx -= parentData.dx;
                dy -= parentData.dy;
                parentData = this.cache[parentData.parentId];
            }
            return {x:dx, y:dy};
        },

        drawNode: function(parentId, pageX, pageY, title, nodeId){
            var nodeId, nodeData, delta;

            // Generate a new id for the node
            if (!nodeId){
                nodeId = this.idCounter ++;
            }

            // Remove the instructions text
            if (!parentId) {
                this.removeInstructions();
            }

            // Store data about the node in a lookup object
            nodeData = this.cache[nodeId] = {
                id: nodeId,
                parentId: parentId,
                title: title
            };

            // Calculate x, y coordinates relative to the parent node
            delta = this.getRelativeCoords(parentId, pageX, pageY);

            // Update the node's text and position, and mark it `selected`
            return this.createElements(nodeData)
                       .updateText(nodeData, title)
                       .updatePosition(nodeData, delta.x, delta.y);
        },

        createElements: function(nodeData){
            var parentId = nodeData.parentId,
                parentData = this.cache[parentId],
                parent, path, node, rect, text;

            // If there's no parent (e.g. for the first node), append to the SVG root
            parent = parentData ?
                parentData.node : this.svg;

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
                bbox;

            // Set the text element's contents
            text.content(title);

            // Get the text's rendered dimensions. `getBBox()` is a native SVG DOM method
            bbox = text[0].getBBox();
            
            // Add padding for the rectangle's dimensions and update the node data
            nodeData.width  = bbox.width + this.PADDING_X * 2;
            nodeData.height = bbox.height + this.PADDING_Y * 2;

            // Update the cached data and apply to the <rect> element
            rect.attr({
                width: nodeData.width,
                height: nodeData.height
            });

            return this;
        },

        updatePosition: function(nodeData, dx, dy){
            var node = nodeData.node,
                parentData = this.cache[nodeData.parentId],
                pathData;

            // Update the cached node data
            nodeData.dx = dx;
            nodeData.dy = dy;

            // Translate the node to the new coordinates
            node.transform('translate', dx, dy);

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
        // `p` = parentData, `n` = nodeData
        getPathData: function(p, n){
            var isLeft  = n.dx > 0,
                isAbove = n.dy > 0,
                x1 = isLeft ? p.width : 0,
                x2 = n.dx + (isLeft ? -x1 : n.width),
                y1 = p.height / 2,
                y2 = n.dy,
                curve = this.PATH_CURVE,
                xCtrl = x2 / 2 + (isLeft ? -curve : curve),
                yCtrl = y2 / 2 + (isAbove ? curve : -curve);

            return 'm' + x1 + ' ' + y1 +
                   'q' + xCtrl + ' ' + yCtrl + ',' + x2  + ' ' + y2;
        },

        makeSelected: function(nodeId){
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

        // Add a <text> element with instructions
        addInstructions: function(){
            this.svg.text({x:10, y:50})
                    .addClass('instructions')
                    .content('Click anywhere to create nodes.');

            this.svg.text({x:10, y:90})
                    .addClass('instructions')
                    .content('Click a node to select as the next parent.')
            return this;
        },

        // Remove the instructions <text> element
        removeInstructions: function(){
            this.svg.find('.instructions').remove();
            return this;
        },

        nearestNode: function(el){
            var node = Pablo(el);
            return node.hasClass('node') ?
                node : node.parents('.node').first();
        },

        dragStart: function(nodeId, pageX, pageY){
            var nodeData = this.cache[nodeId];

            // Store data about the node being dragged
            // The offset is the distance between the node's x,y origin and the mouse cursor
            this.dragging = {
                nodeData: nodeData,
                offsetX: pageX - nodeData.dx,
                offsetY: pageY - nodeData.dy
            };
            return this;
        },

        drag: function(pageX, pageY){
            // Retrieve the stored data about the node being dragged
            var d = this.dragging,
                // Remove the offset between the node's x,y origin and the mouse cursor
                dx = pageX -= d.offsetX,
                dy = pageY -= d.offsetY;

            // Update the node's position
            return this.updatePosition(d.nodeData, dx, dy);
        },

        dragStop: function(){
            this.dragging = null;
            return this;
        },

        setupEvents: function(){
            var mindmap = this;

            this.svg
                .on('mousedown', function(event){
                    var nodeId, node, x, y;

                    // left button click
                    if (event.which === 1){
                        node = mindmap.nearestNode(event.target);
                        x = event.pageX;
                        y = event.pageY;

                        if (node.length){
                            nodeId = node.attr('data-id');
                            mindmap.makeSelected(nodeId);
                            mindmap.dragStart(nodeId, x, y);
                        }
                        else {
                            mindmap.userCreate(x, y);
                        }
                    }
                })
                .on('mousemove', function(event){
                    if (mindmap.dragging){
                        mindmap.drag(event.pageX, event.pageY);
                    }
                })
                .on('mouseup', function(){
                    if (mindmap.dragging){
                        mindmap.dragStop();
                    }
                })

                // When the mouse leaves the SVG element, stop dragging
                // E.g. this prevents the mouse dragging out of the window, the mouse
                // button released _outside_ the window and returning, still dragging
                .on('mouseout', function(event){
                    var to, isSvg;

                    if (mindmap.dragging){
                        // Which element is the mouse entering?
                        to = event.relatedTarget;

                        // Is that element the SVG root or one of its children?
                        isSvg = to && (to === mindmap.svg[0] || to.ownerSVGElement === mindmap.svg[0]);

                        // Stop dragging when the mouse leaves the SVG element
                        if (!isSvg){
                            mindmap.dragStop(event);
                        }
                    }
                });
        }
    };


    /////


    return MindMap;
}());
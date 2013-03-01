/*global Pablo*/
/*jshint newcap:false*/
(function(window){
    'use strict';

    // Create a JavaScript `MindMap` constructor that can
    // be called with `new MindMap('#my-container');`
    function MindMap(htmlContainer){
        this.init(htmlContainer);
    }

    // Create properties and methods for `MindMap` objects
    MindMap.prototype = {
        // SETTINGS

        PADDING_X: 6,
        PADDING_Y: 4,
        CORNER_R: 7,
        PATH_CURVE: 30,
        FONTSIZE: 20,
        nextId: 1,


        // INITIALISE MINDMAP

        init: function(htmlContainer){
            /* Wrap the HTML container element(s) as a Pablo 'collection', and
            empty it (i.e. remove any child nodes).

            The argument `htmlContainer` could be a DOM element, a CSS selector 
            targetting one or more elements, a Pablo collection, or an array of
            elements. Both SVG and HTML elements can be wrapped, although Pablo 
            focusses on SVG. */
            var container = Pablo(htmlContainer).empty();

            /* Empty the HTML container element; append an <svg> root element.
            Often `width` and `height` attributes are given:
                   `collection.svg({width:400, height:'60%'})`
            */
            this.svg = container.svg();

            // Create a simple object cache in memory
            this.cache = {};

            /* Add instructions and setup event handlers for user interaction.
            Most methods return `this`, (which is the `MindMap` object), to 
            allow method chaining, as with jQuery (although jQuery is not a 
            dependency of Pablo), e.g.
                `Pablo('#foo.bar').siblings().attr({x:1})`
            */
            return this.setupEvents()
                       .addInstructions();
        },


        // CREATE MINDMAP NODES

        getId: function(node){
            return node && Number(node.attr('data-id'));
        },

        askTitle: function(){
            var title = window.prompt('What?');
            return title && title.trim();
        },

        // Ask the user what text to put in a new node
        createNode: function(x, y){
            var title = this.askTitle(),
                parent = this.selected && this.selected.node ||
                    this.svg.find('.node').eq(0);

            if (title){
                this.drawNodeAbsolute({
                    parentId: this.getId(parent),
                    title: title
                }, x, y);
            }
            return this;
        },

        // `nodeData` must contain: `parentId`, `dx`, `dy`
        // it may also contain: `id`, `title`
        drawNode: function(nodeData){
            // If there's no parent (e.g. for the first node), append to the SVG root
            var parent = nodeData.parentId ?
                    this.cache[nodeData.parentId].node : this.svg;

            // If there's no specified id, generate a new id
            if (!nodeData.id){
                nodeData.id = this.nextId ++;
            }

            // Store data about the node in a lookup object
            this.cache[nodeData.id] = nodeData;
            
            // Update the node's text and position, and mark it `selected`
            return this.createElements(nodeData, parent)
                       .updateText(nodeData, nodeData.title)
                       .updatePosition(nodeData, nodeData.dx, nodeData.dy);
        },

        getRelativeCoords: function(nodeData, x, y){
            while (nodeData = this.cache[nodeData.parentId]){
                x -= nodeData.dx;
                y -= nodeData.dy;
            }
            return {x:x, y:y};
        },

        drawNodeAbsolute: function(nodeData, x, y){
            // Calculate x, y coordinates relative to the parent node
            var delta = this.getRelativeCoords(nodeData, x, y);
            nodeData.dx = delta.x;
            nodeData.dy = delta.y;

            return this.drawNode(nodeData);
        },


        // CREATE AND UPDATE DOM ELEMENTS

        createElements: function(nodeData, parent){
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
            
            // Add properties to nodeData
            Pablo.extend(nodeData, {
                title:  title,
                // Add padding for the rectangle's dimensions and update the node data
                // TODO: explain why 2*x but only 1*y; it's due to text baseline position and text x position having padding already applied
                width:  bbox.width + this.PADDING_X * 2,
                height: bbox.height + this.PADDING_Y
            });

            // Update the cached data and apply to the <rect> element
            rect.attr({
                width: nodeData.width,
                height: nodeData.height
            });

            return this.updatePath(nodeData);
        },

        updatePosition: function(nodeData, dx, dy){
            var node = nodeData.node;

            // Update the cached node data
            nodeData.dx = dx;
            nodeData.dy = dy;

            // Translate the node to the new coordinates
            node.transform('translate', dx, dy);

            // Update the path drawn between the parent and node
            return this.updatePath(nodeData);
        },

        updatePath: function(nodeData){
            // Get the <path> element
            var path = nodeData.path,
                parentData = this.cache[nodeData.parentId],
                pathData;

            if (parentData){
                // Calculate the curve between the parent and node
                pathData = this.getPathData(nodeData, parentData);

                // Set the element's `d` (data) attribute with the path data
                path.attr('d', pathData);
            }
            return this;
        },


        // CALCULATE PATH'S CURVE


        // Draw a path from the parent to the child
        // `p` = parentData, `n` = nodeData
        getPathData: function(n, p){
            var // Is the node to the left or above the parent?
                isLeft  = n.dx + (n.width  / 2) < 0,
                isAbove = n.dy + (n.height / 2) < 0,

                // The curve connects the two points x1,y1 to x2,y2.
                // x1,y1 is at the parent node's side edge and halfway up.
                // Note that, in this example, x2,y2 is *relative* to x1,y2.
                x1 = isLeft ? 0 : p.width,
                y1 = p.height / 2,

                // The curve stops at the node's side and halfway up.
                x2 = n.dx + (isLeft ? n.width : -x1),
                y2 = n.dy,

                // The curve has a 'control point', to determine the amount and 
                // direction it deviates away from being a straight line. The 
                // control point is positioned a little distance away from a 
                // point halfway the path.
                curve = this.PATH_CURVE,
                controlX = x2 / 2 + (isLeft ? curve : -curve),
                controlY = y2 / 2 + (isAbove ? -curve : curve);

            return 'm' + x1 + ' ' + y1 +
                   'q' + controlX + ' ' + controlY + ',' + x2  + ' ' + y2;
        },

        /*
        xgetPathData: function(n, p){
            var // Is the node to the left or above the parent?
                isLeft  = n.dx + (n.width  / 2) < 0,
                isAbove = n.dy + (n.height / 2) < 0,

                // The curve connects the two points x1,y1 to x2,y2.
                // x1,y1 is at the parent node's side edge and halfway up.
                // Note that, in this example, x2,y2 is *relative* to x1,y2.
                x1 = p.width / 2,
                y1 = isAbove ? 0 : p.height,

                // The curve stops at the node's side and halfway up.
                x2 = n.dx - x1 + n.width / 2,
                y2 = n.dy - y1 + (isAbove ? n.height : 0),

                // The curve has a 'control point', to determine the amount and 
                // direction it deviates away from being a straight line. The 
                // control point is positioned a little distance away from a 
                // point halfway the path.
                curve = this.PATH_CURVE,
                controlX = x2 / 2 + (isLeft ? -curve : curve),
                controlY = y2 / 2 + (isAbove ? curve : -curve);

            return 'm' + x1 + ' ' + y1 +
                   'q' + controlX + ' ' + controlY + ',' + x2  + ' ' + y2;
        },
        */


        // SELECT NODE

        makeSelected: function(nodeId){
            var nodeData = this.cache[nodeId];

            // De-selected currently selected node
            if (this.selected){
                this.selected.node.removeClass('selected');
            }

            // Store node as `mindmap.selected` property
            this.selected = nodeData;

            nodeData.node.addClass('selected')
                // Bring to front, so that it appears on top of other nodes
                .appendTo(nodeData.node.parent());

            return this;
        },


        // DRAG NODE

        dragStart: function(nodeId, x, y){
            var nodeData = this.cache[nodeId];

            // Store data about the node being dragged
            // The offset is the distance between the node's x,y origin and the mouse cursor
            this.dragging = {
                nodeData: nodeData,
                offsetX: x - nodeData.dx,
                offsetY: y - nodeData.dy
            };
            return this;
        },

        drag: function(x, y){
            // Retrieve the stored data about the node being dragged
            var d = this.dragging,
                // Remove the offset between the node's x,y origin and the mouse cursor
                dx = x -= d.offsetX,
                dy = y -= d.offsetY;

            // Update the node's position
            return this.updatePosition(d.nodeData, dx, dy);
        },

        dragStop: function(){
            this.dragging = null;
            return this;
        },


        // ADD/REMOVE INSTRUCTIONS TEXT

        // Add a <text> element with instructions
        addInstructions: function(){
            this.svg.text({x:10})
                .addClass('instructions')
                // Create two more, cloned text nodes
                .duplicate(2)
                // Use an array to set a different `y` attribute to each element
                .attr('y', [50, 100, 150])
                .content([
                    'Keep clicking in space to create a bunch of concepts.',
                    'Click a concept to select it as the next parent.',
                    'Reorder the map by dragging the concepts.'
                ]);

            return this;
        },

        // Remove the instructions <text> element
        removeInstructions: function(){
            this.svg.find('.instructions').remove();
            return this;
        },


        // EVENT HANDLERS

        // If the target element is the outer container for a 
        // mindmap node, then return it. Otherwise, walk up through
        // the element's DOM and return the nextIdt container
        nearestNode: function(el){
            var node = Pablo(el);
            return node.hasClass('node') ?
                node : node.parents('.node').first();
        },

        setupEvents: function(){
            var mindmap = this;

            // Delegate multiple event handlers to the <svg> element
            // This performs better than setting click handlers on every
            // node element in the map.
            this.svg
                // On (only) the first mouse down, remove instructions.
                .one('mousedown', function(){
                    mindmap.removeInstructions();
                })

                // On every mouse down, if clicking on existing node,
                // then select it. Otherwise, create a new one.
                .on('mousedown', function(event){
                    var nodeId, node, x, y;

                    // Left mouse button was pressed
                    if (event.which === 1){
                        // Determine if the click target was a node
                        // element or one of its children.
                        node = mindmap.nearestNode(event.target);
                        x = event.pageX;
                        y = event.pageY;

                        if (node.length){
                            nodeId = node.attr('data-id');
                            mindmap.makeSelected(nodeId);
                            mindmap.dragStart(nodeId, x, y);
                        }
                        else if (event.target === mindmap.svg[0]) {
                            mindmap.createNode(x, y);
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
            return this;
        }
    };


    /////


    window.MindMap = MindMap;
}(this));
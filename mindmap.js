/*global Pablo*/
/*jshint newcap:false*/
var MindMap = (function(){
    'use strict';

    // Check browser support
    if (!Pablo.isSupported){
        return;
    }

    function MindMap(htmlContainer){
        var mindmap = this;

        // Create SVG root
        this.svg = Pablo(htmlContainer).svg({
                width: window.innerWidth,
                height: window.innerHeight
            })
            .on('mousedown', function(event){
                mindmap.onmousedown(event);
            })
            .on('mousemove', function(event){
                mindmap.onmousemove(event);
            })
            .on('mouseup', function(event){
                mindmap.onmouseup(event);
            });

        window.addEventListener('blur', function(){
            mindmap.onwindowblur();
        });

        // An object to store data about each node
        this.nodeData = {};

        // Add instructions message
        this.addInstructions();
    }

    MindMap.prototype = {
        NODE_PADDING_X: 8,
        NODE_PADDING_Y: 5,
        NODE_CORNER_R: 5,
        NODE_FONT_SIZE: 20,
        NODE_PATH_END: 6,
        idCounter: 1,

        nearestNode: function(el){
            var node = Pablo(el);
            return node.hasClass('node') ?
                node : node.parents('.node').first();
        },

        onmousedown: function(event){
            var node = this.nearestNode(event.target),
                x = event.pageX,
                y = event.pageY,
                id, nodeData;

            if (node.length){
                this.select(node);
                this.dragging = node;
                id = node.attr('data-id');
                nodeData = this.nodeData[id];
                this.dragOffsetX = x - nodeData.x;
                this.dragOffsetY = y - nodeData.y;
                this.svg.addClass('dragging');
            }
            else {
                this.userCreate(x, y);
            }
        },

        onmousemove: function(event){
            var x, y;
            if (this.dragging){
                x = event.pageX - this.dragOffsetX;
                y = event.pageY - this.dragOffsetY;
                this.setPosition(this.dragging, x, y);
            }
        },

        onmouseup: function(event){
            if (this.dragging){
                this.dragging = null;
                this.svg.removeClass('dragging');
            }
        },

        onwindowblur: function(){
            this.dragging = null;
        },

        trim: function(str){
            return str ? str.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : '';
        },

        userCreate: function(x, y){
            var title = this.trim(window.prompt('What\'s the text?'));

            if (title){
                this.drawNode(x, y, title, this.selected());
            }
            return this;
        },

        addInstructions: function(){
            this.svg.text({
                x: '50%',
                y: '50%'
            })
            .addClass('instructions')
            .content('Click anywhere to create nodes');
            return this;
        },

        removeInstructions: function(){
            Pablo('.instructions').remove();
            return this;
        },

        // Get or set node data in memory
        data: function(id, data){
            if (!data){
                return this.nodeData[id];
            }
            this.nodeData[id] = data;
            return this;
        },

        drawNode: function(pageX, pageY, title, parent){
            var node, nodeId, nodeData, text, textBBox;

            if (!parent.length){
                // This must be the 'hub', the core concept
                parent = this.svg;

                // Remove the mindmap instructions, as we're adding the first node
                this.removeInstructions();
            }

            // Generate a new id
            nodeId = this.idCounter ++;

            // Append a <g> group element to represent the node
            node = parent.g({'data-id': nodeId})
                         .addClass('node');

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

            // Store data about the node in memory
            nodeData = {
                id: nodeId,
                parent: parent.attr('data-id') || null,
                width:  textBBox.width  + this.NODE_PADDING_X * 2,
                height: textBBox.height + this.NODE_PADDING_Y * 2
            };
            this.data(nodeId, nodeData);

            // Prepend a <rect> rectangle element to surround the text element
            // It is prepended so that the text appears on top
            node.prepend('rect', {
                width:  nodeData.width,
                height: nodeData.height,
                rx: this.NODE_CORNER_R // rounded corners
            });

            // Create a <path> element from the parent to the node
            // Its path data is set in the `setPosition` method
            node.prepend('path', {});
            // TODO: set text, path, rect and then text.bringToFront()
            // === text.append(text.parent());

            // Select the node and set its position
            return this.select(node)
                       .setPosition(node, pageX, pageY);
        },

        setPosition: function(node, pageX, pageY){
            // Position the node by 'translating' it
            var nodeId = node.attr('data-id'),
                nodeData = this.data(nodeId),
                parentData = this.data(nodeData.parent),
                relativeX = pageX,
                relativeY = pageY;

            // Make x & y relative to the parent
            Pablo.extend(nodeData, {x:pageX, y:pageY});

            // Update stored data
            this.data(nodeId, nodeData);

            if (parentData){
                // Draw path to the parent
                node.children('path')
                    .attr('d', this.pathData(nodeData, parentData));

                // Calculate coordinates relative to the parent
                relativeX -= parentData.x;
                relativeY -= parentData.y;
            }

            // Translate the node to the new coordinates
            node.transform('translate', relativeX, relativeY);
            return this;
        },

        // Draw a path from the node to the parent
        pathData: function(nodeData, parentData){
            var CURVE_CONTROL_DIST = 50,
                nIsLeft  = nodeData.x < parentData.x,
                nIsAbove = nodeData.y < parentData.y,
                x1, x2, y1, y2, controlX1, controlX2, controlY1, controlY2,
                cx, cy;

            console.log(parentData.id, nodeData.id, parentData.width);

            if (nIsLeft){
                x1 = nodeData.width;
                x2 = parentData.x - nodeData.x - x1;
                controlX1 = CURVE_CONTROL_DIST;
                controlX2 = x2;
                cx = x2 - x1;
            }
            else {
                x1 = 0;
                x2 = parentData.x - nodeData.x + parentData.width;
                controlX1 = 0 - CURVE_CONTROL_DIST;
                controlX2 = x2;
                cx = x1;
            }

            if (nIsAbove){
                y1 = nodeData.height / 2;
                y2 = parentData.y - nodeData.y - y1 + parentData.height / 2;
                controlY1 = 0;
                controlY2 = CURVE_CONTROL_DIST;
                cy = y2 - y1;
            }
            else {
                y1 = nodeData.height / 2;
                y2 = parentData.y - nodeData.y - y1 + parentData.height / 2;
                controlY1 = CURVE_CONTROL_DIST;
                controlY2 = 0;
                cy = y2 - y1;
            }

            /*
            return 'm' + x1 + ' ' + y1 +
                   'q' + cx + ' ' + cy + ',' +
                         x2 + ' ' + y2;
            */

            // this.svg.find('[data-id=' + nodeData.id + ']').circle({cx: })

            return 'm' + x1 + ' ' + y1 +
                   //'l' + controlX1    + ' ' + controlY1 + 
                   //'l' + controlX2    + ' ' + controlY2 + 
                   //'m' + (-controlX1 - controlX2)    + ' ' + (-controlY1 + -controlY2) + 
                   'c' + controlX1 + ' ' + controlY1 + ',' +
                         controlX2 + ' ' + controlY2 + ',' +
                         x2 + ' ' + y2;
                   //'l' + x2    + ' ' + y2;



            // Node is left of the parent
            if (nX < pX){
                startX  = nodeData.width;
                endX    = tip;
                parentX = diffX - tip;
            }
            else {
                startX  = 0;
                endX    = 0 - tip;
                parentX = relativeX + parentData.width + endLength;
            }

            return 'm' + startX  + ' ' + nodeMidY +
                   'l' + endX    + ' ' + 0 +
                   'c' + (parentX) + ',' + parentX + ' ' + parentY +
                   //'L' + parentX + ' ' + parentY +
                   'l' + endX    + ' ' + 0;
        },

        xpathData: function(nodeData, parentData){
            var isLeft     = nodeData.x < parentData.x,
                endLength  = this.NODE_PATH_END,
                nodeMidY   = nodeData.height / 2,
                parentMidY = parentData.height / 2,
                relativeX  = parentData.x - nodeData.x,
                relativeY  = parentData.y - nodeData.y,
                parentY    = relativeY + parentMidY,
                startX, endX, parentX;

            if (isLeft){
                startX  = nodeData.width;
                endX    = endLength;
                parentX = relativeX - endLength;
            }
            else {
                startX  = 0;
                endX    = 0 - endLength;
                parentX = relativeX + parentData.width + endLength;
            }

            return 'm' + startX  + ' ' + nodeMidY +
                   'l' + endX    + ' ' + 0 +
                   'L' + parentX + ' ' + parentY +
                   'l' + endX    + ' ' + 0;
        },

        selected: function(){
            return this.svg.find('.selected');
        },

        select: function(node){
            this.selected().removeClass('selected');
            node.addClass('selected');
            node.appendTo(node.parent());
            return this;
        }
    };

    
    /////


    var mm = new MindMap('#mindmap'),
        svg = mm.svg;

    mm.drawNode(220, 300, 'Trees', Pablo())
      .drawNode(100, 100, 'Birch', svg.find('.node').first())
      .drawNode(150, 500, 'Oak', svg.find('.node').first())
      .drawNode(10, 400, 'Larch', svg.find('.node').eq(2))
      .drawNode(310, 230, 'Pine', svg.find('.node').first());
    window.mm = mm;


    /////


    return MindMap;
}());
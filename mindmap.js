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

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Create SVG root
        this.svg = Pablo(htmlContainer).svg({
                width: this.width,
                height: this.height
            })
            .on('mousedown', function(event){
                // left button click
                if (event.which === 1){
                    mindmap.onmousedown(event);
                }
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
        PATH_CURVE: 30,
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
            var nodeId, parentId, node, nodeData, text, textBBox;

            // Generate a new id
            nodeId = this.idCounter ++;
            parentId = parent.attr('data-id') || null;

            if (!parentId){
                // This must be the 'hub', the core concept
                parent = this.svg;

                // Remove the mindmap instructions, as we're adding the first node
                this.removeInstructions();
            }

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
                parent: parentId,
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

            if (parentId){
                // Create a <path> element from the parent to the node
                // The path's coordinates are set in the `setPosition` method
                parent.prepend('path', {'data-child': nodeId});
            }

            // Select the node and set its position
            return this.select(node)
                       .setPosition(node, pageX, pageY);
        },

        setPosition: function(node, pageX, pageY){
            // Position the node by 'translating' it
            var nodeId = node.attr('data-id'),
                nodeData = this.data(nodeId),
                parentId = nodeData.parent,
                parentData = this.data(parentId),
                relX = pageX,
                relY = pageY,
                path;

            // Make x & y relative to the parent
            Pablo.extend(nodeData, {x:pageX, y:pageY});

            // Update stored data
            this.data(nodeId, nodeData);

            if (parentData){
                // Draw path from the parent to the node
                path = this.svg.find('path[data-child="' + nodeId + '"]');
                path.attr('d', this.pathData(parentData, nodeData));

                // Calculate coordinates relative to the parent
                relX = pageX - parentData.x;
                relY = pageY - parentData.y;
            }

            // Translate the node to the new coordinates
            node.transform('translate', relX, relY);
            return this;
        },

        // Draw a path from the parent to the child
        // p = parentData, n = nodeData
        pathData: function(p, n){
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
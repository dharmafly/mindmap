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
                // Alternatively, specify `svg {width:100%; height:100%;}`
                // in the CSS stylesheet
                width: '100%',
                height: '100%'
            })
            // Set up event handlers - see mindmap.onmousedown(), etc
            .on('mousedown mousemove mouseup mouseout', function(event){
                mindmap['on' + event.type](event);
            });

        // Create lookup objects
        this.nodeData = {}; // data about each node
        this.paths = {};    // path elements

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

        getById: function(id){
            var node = this.svg.find('[data-id="' + id + '"]');
            return node.length ? node : null;
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

        // Get or set node data in memory
        data: function(id, data){
            if (!data){
                return this.nodeData[id];
            }
            this.nodeData[id] = data;
            return this;
        },

        drawNode: function(parentId, x, y, title){
            var nodeId, parent, node, nodeData, text, textBBox;

            // Generate a new id
            nodeId = this.idCounter ++;

            // Find the parent node. For the first node, this is the SVG root
            parent = this.getById(parentId) || this.svg;

            // Append a <g> group element to the parent to represent the 
            // mindmap node in the DOM
            node = parent.g({'data-id': nodeId}).addClass('node');

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
                /* Create a <path> element to visually connect the parent and node.
                   The path's coordinates will be set in the `setPosition` method.
                   We store the path in the `mindmap.paths` lookup object to maximise
                   performance when dragging nodes and re-rendering the path's curve.
                */
                this.paths[nodeId] = Pablo.path().prependTo(parent);
            }
            else {
                // This must be the first node, so remove the instructions text
                this.removeInstructions();
            }

            // Select the node and set its position
            return this.select(node)
                       .setPosition(node, x, y);
        },

        setPosition: function(node, x, y){
            var nodeId = this.getId(node),
                nodeData = this.data(nodeId),
                parentData = this.data(nodeData.parent),
                pathData;

            // Update stored data
            Pablo.extend(nodeData, {x:x, y:y});
            this.data(nodeId, nodeData);

            if (parentData){
                // Draw path from the parent to the node
                pathData = this.pathData(parentData, nodeData);
                this.paths[nodeId].attr('d', pathData);

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
            var id = this.getId(node),
                nodeData = this.nodeData[id];

            this.dragging = {
                node: node,
                offsetX: x - nodeData.x,
                offsetY: y - nodeData.y
            };
            this.svg.addClass('dragging');
            return this;
        },

        drag: function(x, y){
            var d = this.dragging;
            return this.setPosition(d.node, x - d.offsetX, y - d.offsetY);
        },

        dragStop: function(){
            this.dragging = null;
            this.svg.removeClass('dragging');
            return this;
        }
    };

    
    /////


    var mm = new MindMap('#mindmap'),
        svg = mm.svg;

    mm.drawNode(null, 220, 300, 'Trees')
      .drawNode(1, 100, 100, 'Birch')
      .drawNode(1, 150, 500, 'Oak')
      .drawNode(3, 10, 400, 'Larch')
      .drawNode(1, 310, 230, 'Pine');
    window.mm = mm;


    /////


    return MindMap;
}());
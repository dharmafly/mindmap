/*global Pablo*/
/*jshint newcap:false*/
(function(){
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
            .on('click', function(event){
                var target = Pablo(event.target);

                if (target.parent().hasClass('nodes')){
                    mindmap.select(target);
                }
                else {
                    mindmap.userCreate({
                        x: event.pageX,
                        y: event.pageY
                    });
                }
            });

        // An object to store data about each node
        this.nodeData = {};
    }

    MindMap.prototype = {
        NODE_PADDING_X: 8,
        NODE_PADDING_Y: 5,
        NODE_CORNER_R: 5,
        NODE_FONT_SIZE: 20,
        NODE_PATH_END: 6,
        idCounter: 1,

        trim: function(str){
            return str ? str.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : '';
        },

        userCreate: function(pos){
            var title = this.trim(window.prompt('What\'s the text?'));

            if (title){
                this.drawNode(pos, title, this.selected());
            }
            return this;
        },

        removeInstructions: function(){
            Pablo('.instructions').remove();
            return this;
        },

        data: function(node, data){
            var id = node.attr('data-id');

            // Get data
            if (!data){
                return this.nodeData[id];
            }
            // Set data
            this.nodeData[id] = data;
            return this;
        },

        getNodeById: function(id){
            return this.nodes.find('[data-id=' + id + ']');
        },

        drawNode: function(pos, title, parent){
            var isHub, node, nodeId, nodeData, parentData;

            // Is there a parent to this node?
            if (parent.length){
                // Get data stored about the parent
                parentData = this.data(parent);
            }
            // This must be the 'hub', the core concept
            else {
                isHub = true;
                parent = this.svg;
                parentData = {x:0, y:0};
            }

            // Generate a new id
            nodeId = this.idCounter ++;

            // Append a <g> group element to represent the node
            node = parent.g({'data-id': nodeId})
                         .addClass('node');

            // Create a <rect> rectangle element and give it rounded corners
            node.rect({rx: this.NODE_CORNER_R});

            // Create a <text> element and set its text content
            node.text({'font-size': this.NODE_FONT_SIZE})
                       .content(title);

            // This the 'hub', core concept
            if (isHub){
                // Add a `class` attribute
                node.addClass('hub');

                // Remove the mindmap instructions, as we're adding the first node
                this.removeInstructions();
            }

            // Draw a path from the parent to the node
            else {
                node.path({
                    'data-child': nodeId
                });
            }

            // Set the position of the node
            nodeData = this.setPosition(node, pos, parentData);

            // Store data about the node in memory
            Pablo.extend(nodeData, {
                id: nodeId,
                parent: parentData.id
            });
            this.data(node, nodeData);

            // Select the node
            return this.select(node);
        },

        setPosition: function(node, pos, parentData){
            var elements = node.children(),
                text = elements.select('text'),
                rect = elements.select('rect'),
                path = elements.select('path'),
                textBBox, nodeData, relativeX, relativeY;

            text.attr({
                x: this.NODE_PADDING_X,
                y: this.NODE_FONT_SIZE
            });

            // Get the text's rendered dimensions; a native SVG DOM method
            textBBox = text[0].getBBox();

            nodeData = {
                x:      pos.x,
                y:      pos.y,
                width:  textBBox.width + this.NODE_PADDING_X * 2,
                height: textBBox.height + this.NODE_PADDING_Y * 2
            };

            // Set rectangle dimensions to surround the text element
            rect.attr({
                width:  nodeData.width,
                height: nodeData.height
            });

            // Position the node by 'translating' it
            relativeX = pos.x - parentData.x;
            relativeY = pos.y - parentData.y;
            node.transform('translate', relativeX, relativeY);

            if (path.length){
                path.attr('d', this.pathData(nodeData, parentData));
            }
            return nodeData;
        },

        pathData: function(nodeData, parentData){
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
            return this;
        }
    };

    
    /////


    var mm = new MindMap('#mindmap');
    mm.drawNode({x:220, y:300}, 'Trees', mm.selected());
    mm.drawNode({x:100, y:100}, 'Birch', mm.svg.find('.hub'));
    mm.drawNode({x:150, y:500}, 'Oak', mm.svg.find('.hub'));
    mm.drawNode({x:10, y:400}, 'Breem', mm.svg.find('.node').last());
    window.mm = mm;

    /*
    window.addEventListener('keydown', function(event){
        mm.onkeydown(event);
    }, false);
    */



///////////

return;



var PI = Math.PI,
    minTheta = PI / 20,
    originX = 300,
    originY = 300,
    r = 300,
    startAngles = [PI / 2, PI - minTheta, minTheta],
    angles = [];

// Draw circle
mm.svg.empty().circle({cx:300, cy:300, r:r, fill:'none', stroke:'black'});

function line(x, y){
    return mm.svg.line({x1:r, y1:r, x2:x, y2:y, stroke:'black'});
}

function drawAngle(){
    var maxDiff, maxDiffIndex, angle, diff, i, length;

    if (angles.length < startAngles.length){
        angle = startAngles[angles.length];
    }
    else {
        maxDiff = 0;
        for (i=0, length=angles.length; i<length-1; i++){
            diff = angles[i] - angles[i+1];

            if (maxDiff + 0.000001 < diff){
                maxDiff = diff;
                maxDiffIndex = i;
            }
        }
        angle = (angles[maxDiffIndex] + angles[maxDiffIndex+1]) / 2;
    }

    angles.push(angle);
    angles.sort().reverse();
    line(originX + Math.sin(angle) * r, originY + Math.cos(angle) * r);
}

// TODO: use originX and y to translate groups

drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();
drawAngle();

}());
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
                this.drawNode(pos.x, pos.y, title, this.selected());
            }
            return this;
        },

        removeInstructions: function(){
            Pablo('.instructions').remove();
            return this;
        },

        data: function(id, data){
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

        drawNode: function(screenX, screenY, title, parent){
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

            // Create a <path> element from the parent to the node
            // Its path data is set in the `setPosition` method
            node.path();

            // Create a <text> element and set its text content
            text = node.text({
                    x: this.NODE_PADDING_X,
                    y: this.NODE_FONT_SIZE,
                    'font-size': this.NODE_FONT_SIZE
                })
                .content(title);

            // Get the text's rendered dimensions; a native SVG DOM method
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

            // Select the node and set its position
            return this.select(node)
                       .setPosition(node, screenX, screenY);
        },

        setPosition: function(node, screenX, screenY){
            // Position the node by 'translating' it
            var nodeId = node.attr('data-id'),
                nodeData = this.data(nodeId),
                parentData = this.data(nodeData.parent),
                relativeX = screenX,
                relativeY = screenY;

            // Make x & y relative to the parent
            Pablo.extend(nodeData, {x:screenX, y:screenY});

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
    mm.drawNode(220, 300, 'Trees', mm.selected());
    mm.drawNode(100, 100, 'Birch', mm.svg.children('.node'));
    mm.drawNode(150, 500, 'Oak', mm.svg.children('.node'));
    mm.drawNode(10, 400, 'Breem', mm.svg.find('.node').last());
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
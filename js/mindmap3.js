/*global Pablo*/
/*jshint newcap:false*/
(function(){
    'use strict';

    // Check browser support
    if (!Pablo.isSupported){
        return;
    }

    var NODE_PADDING_X = 8,
        NODE_PADDING_Y = 5,
        NODE_CORNER_R = 5,
        NODE_FONT_SIZE = 20,
        NODE_PATH_END = 6,
        idCounter = 1;

    function MindMap(htmlContainer){
        var mindmap = this;

        this.nodes = {};

        // Create SVG root
        this.svg = Pablo(htmlContainer).svg({
                width: window.innerWidth,
                height: window.innerHeight
            })
            .on('click', function(event){
                var target = Pablo(event.target);

                if (target.hasClass('node')){
                    mindmap.select(target);
                }
                else {
                    mindmap.userCreate({
                        x: event.pageX,
                        y: event.pageY
                    });
                }
            });
    }

    MindMap.prototype = {
        userCreate: function(pos){
            var title = this.trim(window.prompt('What\'s the text?'));

            if (title){
                this.drawChild(pos, title, this.selected());
            }
            return this;
        },

        removeInstructions: function(){
            Pablo('.instructions').remove();
            return this;
        },

        drawChild: function(pos, title, parent){
            var isHub, node, nodeId, text, textBBox, parentIsHub, nodeData, parentData, parentId, childnodes, path;

            // Is the parent an existing node? If not, we'll create a hub
            if (!parent.hasClass('node')){
                isHub = true;
	        	parentData = {
	                x: 0,
	                y: 0,
	                width: 0,
	                height: 0,
	                childnodes: this.svg
	            };
            }
            else {
	            parentId = parent.attr('id');
	            parentData = this.nodes[parentId];
	        }

            nodeId = 'node-' + idCounter;
            idCounter += 1;

            // Create a group element on the container to represent the node
            node = parentData.childnodes.g({id: nodeId})
                    .addClass('node');

            // Create a text element
            text = node.text({
                x: NODE_PADDING_X,
                y: NODE_FONT_SIZE,
                'font-size': NODE_FONT_SIZE
            }).content(title);

            // Get bounding box coordinates
            // This will tell us how wide and high the text is rendered
            textBBox = text[0].getBBox();

            // Add group element to contain child nodes
            childnodes = node.g().addClass('childnodes');

            this.nodes[nodeId] = nodeData = {
                x:      pos.x - parentData.x,  // relative to parent
                y:      pos.y - parentData.y,  // relative to parent
                width:  textBBox.width + NODE_PADDING_X * 2,
                height: textBBox.height + NODE_PADDING_Y * 2,
                childnodes: childnodes
            };

            // Position the node by 'translating' it
            node.transform('translate', nodeData.x, nodeData.y);

            // Rounded rectangle; we prepend it so the text is visible on top of it
            node.prepend('rect', {
                width:  nodeData.width,
                height: nodeData.height,
                rx:     NODE_CORNER_R
            });

            if (isHub){
                // Remove the mindmap instructions, as we're adding the first node
                this.removeInstructions();

                // Add a `class` attribute
                node.addClass('hub');
            }
            else {
                // Add path
                parentData.childnodes.prepend('path',{
                    d:  this.pathData(nodeData, parentData)
                });
            }

            // Select the node
            return this.select(node);
        },

        // nodeData x and y is relative to parentData
        pathData: function(nodeData, parentData){
        	var isLeft  = nodeData.x < 0,
        		d = '';

        	d += 'M' + (isLeft  ? 0 : parentData.width) + ' ' +
        		 	   (parentData.height / 2) +
                 'L' + (isLeft ? nodeData.x + nodeData.width : nodeData.x) + ' ' +
                       (nodeData.y + nodeData.height / 2) +
                 'l' + (isLeft ? -NODE_PATH_END : NODE_PATH_END) + ' ' + 0;

            return d;
        },

        hub: function(){
            return this.svg.find('.hub');
        },

        selected: function(){
            return this.svg.find('.selected');
        },

        select: function(node){
            this.selected().removeClass('selected');
            node.addClass('selected');
            return this;
        },

        trim: function(str){
            return str ? str.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : '';
        },

        getX: function(node){
            return Number(node.find('text').eq(0).attr('x'));
        },

        getY: function(node){
            return Number(node.find('text').eq(0).attr('y'));
        },

        sortByY: function(nodes){
            var mindmap = this;
            return Pablo(
                nodes.toArray().sort(function(a, b){
                    return mindmap.getY(Pablo(a)) > mindmap.getY(Pablo(b));
                })
            );
        },

        getParentNode: function(node){
            var parentNode = node.parent().parent();
            // If the parent is not a node, then return empty collection
            return parentNode.hasClass('node') ?
                parentNode : Pablo();
        },

        onkeydown: function(event){
            // See http://unixpapa.com/js/key.html
            var code = event.which,
                selected, parent, toSelect, children, sortedChildren, siblings, sortedSiblings, index;

            if (code === 9 || code === 13 || code >= 37 || code <=40){
                selected = this.selected();
                parent = this.getParentNode(selected);
                children = selected.find('.nodes').eq(0).children();
                siblings = selected.siblings();
                event.preventDefault();
            }

            switch (code){
                // Tab key: create a child
                case 9:
                this.userCreate(selected);
                break;

                // Return key: create a sibling
                case 13:
                this.userCreate(parent.length ? parent : selected);
                break;

                // Left arrow: select parent
                case 37:
                toSelect = parent;
                break;

                // Right arrow: select top child
                case 39:
                sortedChildren = this.sortByY(children);
                toSelect = sortedChildren.first();
                break;

                // Up arrow: select sibling above
                case 38:
                sortedSiblings = this.sortByY(siblings);
                index = sortedSiblings.indexOf(selected);
                toSelect = sortedSiblings.eq(index - 1);

                // Wrap around to the bottom sibling
                if (!toSelect.length){
                    toSelect = sortedSiblings.last();
                }
                break;

                // Down arrow: select sibling below
                case 40:
                sortedSiblings = this.sortByY(siblings);
                index = sortedSiblings.indexOf(selected);
                toSelect = sortedSiblings.eq(index + 1);

                // Wrap around to the top sibling
                if (!toSelect.length){
                    toSelect = sortedSiblings.first();
                }
                break;
            }

            // Select
            if (toSelect){
                this.select(toSelect);
            }
            
            return this;
        }
    };

    
    /////


    var mm = new MindMap('#mindmap');
    mm.drawChild({x:220, y:300}, 'Trees', mm.selected());
    mm.drawChild({x:100, y:100}, 'Birch', mm.hub());
    mm.drawChild({x:150, y:500}, 'Oak', mm.hub());
    mm.drawChild({x:0, y:0}, 'Breem', mm.svg.find('.node').last());
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
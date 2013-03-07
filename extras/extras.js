(function(window, Pablo, MindMap, JSON){
    'use strict';

    // TODO: fix bug where editing a parent's text doesn't update the child's path offset

    var localStorage = window.localStorage;

    Pablo.extend(MindMap.prototype, {
        resetUi: function(){
            this.svg.find('.instructions,.node,path').remove();
            return this;
        },

        // Icons by Adam Whitcroft: http://adamwhitcroft.com/batch/
        addIcons: function(){
            var mindmap = this,
                actions = this.svg.g()
                    .addClass('actions')
                    .transform('translate', 5, 10);

            actions.image({
                    width: 24,
                    height: 24
                })
                .addClass('icon')
                .css('cursor', 'pointer')
                .duplicate(3)
                .attr({
                    'data-action': ['edit', 'delete', 'save', 'restore'],
                    'xlink:href': [
                        'images/pencil.svg',
                        'images/bin-3.svg',
                        'images/arrow-down.svg',
                        'images/arrow-up.svg'
                    ]
                })
                .transform('translate', function(el, i){
                    return '0 ' + (i * 28);
                })
                .title().content([
                    'Edit node',
                    'Delete node',
                    'Save map',
                    'Restore map'
                ]);

            actions.on('click', function(event){
                var target = Pablo(event.target);

                if (target.hasClass('icon')){
                    switch (target.attr('data-action')){
                        case 'edit':
                        if (mindmap.selected){
                            mindmap.editNode(mindmap.selected);
                        }
                        break;

                        case 'delete':
                        if (mindmap.selected){
                            mindmap.deleteNode(mindmap.selected);
                        }
                        break;

                        case 'save':
                        mindmap.saveState();
                        break;

                        case 'restore':
                        mindmap.restoreState();
                        break;
                    }
                }
            });

            return this;
        },

        // LOCAL STORAGE

        LOCALSTORAGE_PREFIX: 'mindful-',

        getLocalStorage: function(key){
            var data;
            if (localStorage){
                data = localStorage && localStorage[this.LOCALSTORAGE_PREFIX + key];
            }
            return data && JSON.parse(data);
        },

        setLocalStorage: function(key, data){
            if (localStorage){
                localStorage[this.LOCALSTORAGE_PREFIX + key] = JSON.stringify(data);
            }
            return this;
        },


        // The minimum node data in memory necessary to recreate
        // the map is saved in localStorage and can be later restored
        saveState: function(){
            var cache = this.cache,
                // Ensure we pre-sort the node ids on save, to
                // maximise load performance
                nodeIds = Object.keys(cache).sort(function(a, b){
                    return Number(a) - Number(b);
                }),
                nodesData;

            nodesData = nodeIds.map(function(nodeId){
                var nodeData = cache[nodeId];

                return {
                    id:       nodeData.id,
                    parentId: nodeData.parentId,
                    title:    nodeData.title,
                    dx:       nodeData.dx,
                    dy:       nodeData.dy
                };
            });

            return this.setLocalStorage('nodes', nodesData);
        },

        restoreState: function(){
            var nodesData = this.getLocalStorage('nodes'),
                lastNode;

            if (nodesData){
                this.resetUi();

                // Draw every node in the stored cache
                nodesData.forEach(function(nodeData){
                    this.drawNode(nodeData);
                }, this);

                // Set the next id counter to the latest node
                lastNode = nodesData[nodesData.length-1];
                this.nextId = lastNode.id + 1;
            }
            return this;
        },

        /////

        // EDITING

        editNode: function(nodeData){
            var title = this.askTitle();

            if (title){
                this.updateText(nodeData, title);
            }
            return this;
        },

        /////

        // DELETION

        deleteNode: function(nodeData){
            var nodeId;

            if (window.confirm('Are you sure?')){
                nodeId = nodeData.id;

                // Remove DOM elements
                nodeData.node.remove();
                nodeData.path.remove();

                // Delete data stored in memory
                delete this.cache[nodeId];

                // Delete child nodes
                Object.keys(this.cache)
                    .filter(function(testId){
                        return nodeId === this.cache[testId].parentId;
                    }, this)
                    .forEach(function(nodeId){
                        this.deleteNode(this.cache[nodeId]);
                    }, this);

                // If this node is `selected` then select the parent node
                if (this.selected && this.selected.id === nodeId){
                    if (this.selected.parentId){
                        this.makeSelected(this.selected.parentId);
                    }
                    else {
                        this.selected = null;
                    }
                }
            }

            return this;
        }
    });
}(this, this.Pablo, this.MindMap, this.JSON));
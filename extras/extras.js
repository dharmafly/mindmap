/*global Pablo*/
/*jshint newcap:false*/
(function(window, Pablo, MindMap, JSON){
    'use strict';

    // TODO: fix bug where editing a parent's text doesn't update the child's path offset

    var localStorage = window.localStorage;

    Pablo.extend(MindMap.prototype, {
        resetUi: function(){
            this.svg.find('.instructions,.node').remove();
            this.nodes.length = 0;
            this.selected = this.rootNode;
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
                    // data- attributes are similar to setting .data()
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

            actions.on('mousedown', '.icon', function(event){
                switch (Pablo(event.target).attr('data-action')){
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
                event.stopPropagation();
            }, true);

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
        getState: function(){
            var nodesData = [];

            this.nodes.forEach(function(node){
                nodesData.push({
                    id:       node.id,
                    parentId: node.parent && node.parent.id,
                    title:    node.title,
                    dx:       node.dx,
                    dy:       node.dy
                });
            });
            return nodesData;
        },


        // The map is saved in localStorage and can be later restored
        saveState: function(){
            var nodesData = [];

            this.nodes.forEach(function(node){
                nodesData.push({
                    id:       node.id,
                    parentId: node.parent && node.parent.id,
                    title:    node.title,
                    dx:       node.dx,
                    dy:       node.dy
                });
            });
            return this.setLocalStorage('nodes', nodesData);
        },

        restoreState: function(){
            var nodesData = this.getLocalStorage('nodes'),
                lastNode;

            if (nodesData){
                this.resetUi();

                // Draw every node in the stored cache
                this.restoreFrom(nodesData);

                // Set the next id counter to the latest node
                lastNode = nodesData[nodesData.length-1];
                this.nextId = lastNode.id + 1;
            }
            return this;
        },

        restoreFrom: function(nodes){
            // Draw each node
            nodes.forEach(function(settings){
                this.nodes.some(function(cachedNode){
                    if (cachedNode.id === settings.parentId){
                        settings.parent = cachedNode;
                        return true;
                    }
                }, this);

                this.createNode(settings);
            }, this);
            return this;
        },

        /////

        // EDITING

        editNode: function(node){
            var title = this.askTitle();

            if (title){
                node.title = title;
                node.setText(title)
                    .dom.children('.node').each(function(el){
                        Pablo(el).data('node').setPath();
                    }, this);

                // TODO: update children's paths
            }
            return this;
        },

        /////

        // DELETION

        deleteNode: function(node, silent){
            var cacheIndex;

            if (silent || window.confirm('Are you sure?')){
                // Remove DOM elements
                node.dom.remove();

                if (node.path){
                    node.path.remove();
                }

                // Delete data stored in memory
                cacheIndex = this.nodes.indexOf(node);
                delete this.nodes[cacheIndex];

                // Delete child nodes
                this.nodes
                    .filter(function(cachedNode){
                        return cachedNode.parent.id === node.id;
                    }, this)
                    .forEach(function(cachedNode){
                        this.deleteNode(cachedNode, true);
                    }, this);

                // If this node is `selected` then select the parent node
                if (this.selected.id === node.id){
                    this.makeSelected(node.parent);
                }
            }

            return this;
        }
    });
}(this, this.Pablo, this.MindMap, this.JSON));
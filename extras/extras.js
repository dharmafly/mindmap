(function(window, Pablo, MindMap, JSON){
	'use strict';

	var localStorage = window.localStorage;

	Pablo.extend(MindMap.prototype, {
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
					return a - b;
				}),
				nodes;

			nodes = nodeIds.map(function(nodeId){
				var nodeData = cache[nodeId];

				return {
					parentId: nodeData.parentId,
					title: nodeData.title,
					dx: nodeData.dx,
					dy: nodeData.dy
				};
			});

			return this.setLocalStorage('nodes', nodes);
		},

		restoreState: function(){
			var nodes = this.getLocalStorage('nodes'),
				lastNode;

			if (nodes){
				this.svg.empty();

				// Draw every node in the stored cache
				nodes.forEach(function(nodeData){
					this.drawNode(nodeData);
				}, this);

				// Set the next id counter to the latest node
				lastNode = nodes.slice(-1)[0];
				this.nextId = lastNode.id + 1;
			}
			return this;
		},

		/////

		// DELETION

		deleteNode: function(nodeData){
			var nodeId = nodeData.id,
				parent;

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
			if (this.getId(this.selected) === nodeId){
				parent = this.svg.find('[data-id="' + nodeId + '"]');
				this.selected = null;
			}

	        return this;
	    }
	});
}(this, this.Pablo, this.MindMap, this.JSON));
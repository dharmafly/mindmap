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

        getAbsoluteCoords: function(nodeData){
        	var x = nodeData.dx,
        		y = nodeData.dy;

            while (nodeData = this.cache[nodeData.parentId]){
                x += nodeData.dx;
                y += nodeData.dy;
            }
            return {x:x, y:y};
        },

		saveState: function(){
			var toSave = {},
				nodeId, nodeData;

			for (nodeId in this.cache){
				if (this.cache.hasOwnProperty(nodeId)){
					nodeData = this.cache[nodeId];
					toSave[nodeId] = {
						parentId: nodeData.parentId,
						dx: nodeData.dx,
						dy: nodeData.dy,
						title: nodeData.title
					};
				}
			}
			return this.setLocalStorage('nodes', toSave);
		},

		restoreState: function(){
			var localStorageCache = this.getLocalStorage('nodes'),
				maxId, nodeId, nodeData, coords;

			if (localStorageCache){
				this.svg.empty();
				maxId = 0;

				for (nodeId in localStorageCache){
					if (localStorageCache.hasOwnProperty(nodeId)){
						nodeId = Number(nodeId);
						nodeData = localStorageCache[nodeId];
						coords = this.getAbsoluteCoords(nodeData);
						this.drawNode(
							nodeData.parentId,
							coords.x,
							coords.y,
							nodeData.title,
							nodeId
						);
						if (nodeId > maxId){
							maxId = nodeId;
						}
					}
				}
				// Start counter after last id
				this.idCounter = maxId + 1;
			}
			return this;
		},

		/////

		// DELETION

		deleteNode: function(nodeData){
	        nodeData.node.remove();
	        nodeData.path.remove();
	        delete this.cache[nodeData.id];
	        return this;
	    }
	});
}(this, this.Pablo, this.MindMap, this.JSON));
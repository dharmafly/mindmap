(function(window, Pablo, MindMap, JSON){
	var localStorage = window.localStorage;
	
	if (!localStorage){
		return;
	}

	Pablo.extend(MindMap.prototype, {
		LOCALSTORAGE_PREFIX: 'mindful-',

		getLocalStorage: function(key){
			var data = localStorage[this.LOCALSTORAGE_PREFIX + key];
			return data && JSON.parse(data);
		},

		setLocalStorage: function(key, data){
			localStorage[this.LOCALSTORAGE_PREFIX + key] = JSON.stringify(data);
			return this;
		},

		saveState: function(){
			var toSave = {},
				nodeId;

			for (nodeId in this.cache){
				if (this.cache.hasOwnProperty(nodeId)){
					nodeData = this.cache[nodeId];
					toSave[nodeId] = {
						parentId: nodeData.parentId,
						x: nodeData.x,
						y: nodeData.y,
						title: nodeData.title
					};
				}
			}
			return this.setLocalStorage('nodes', toSave);
		},

		restoreState: function(){
			var localStorageCache = this.getLocalStorage('nodes'),
				maxId = 0;

			this.svg.empty();

			for (nodeId in localStorageCache){
				if (localStorageCache.hasOwnProperty(nodeId)){
					nodeId = Number(nodeId);
					nodeData = localStorageCache[nodeId];
					this.drawNode(
						nodeData.parentId,
						nodeData.x,
						nodeData.y,
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
			return this;
		}
	});
}(this, this.Pablo, this.MindMap, this.JSON));
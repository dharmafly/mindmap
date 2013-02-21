(function(window, Pablo, MindMap){
    MindMap.prototype.deleteNode = function(nodeData){
        nodeData.node.remove();
        nodeData.path.remove();
        delete this.cache[nodeData.id];
        return this;
    };
}(this, this.Pablo, this.MindMap));
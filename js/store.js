var Store = (function(){
  var 
    playlist = [],
    history,
    index,
    pub = {};

  if($.jStorage.get('history') == null) {
    $.jStorage.set('history', []);
  }
  history = $.jStorage.get('history');
      
  return _.extend(pub, {
    create: function(){
      index = history.length;
      history.push([]);
      return index;
    },

    get: function(_index) {
      index = _index;

      return _.map(history[_index], function(which) {
        return which[0];
      });
    },

    add: function(offset, tuple) {
      history[index][offset] = tuple;
      $.jStorage.set('history', history);
    },

    recent: function() {
      return _.map(history.slice(-3), function(which) {
        return which[0];
      });
    }
  });
})();

var 
  db = DB(), 
  each = _.each,
  map = _.map,
  extend = _.extend,
  ev = EvDa({
    'app_state': '',
    'playlist_name': '',
    'search_related': [],
    'search_results': [],
    'active_track': {},
    'search_query': ''
  }),
  _get = function(id){ 
    try {
      return document.getElementById(id);
    } catch (ex) {
      var div = document.body.appendChild(document.createElement('div'));
      div.setAttribute('id', id);
      return div;
    }
  },
  _video = {
    width: 260 + 8 * 2 + 4 * 2,
    height: 77 + 8 * 2 + 4 * 2,
    old: {start: 0, stop: 0, query: ''}
  },
  _remote = {
    active: false
  };

db.constrain('unique', 'ytid');
db.template.create({
  reference: [],
  removed: 0
});

/*
ev.sniff();
ev.sniff('tick');
*/

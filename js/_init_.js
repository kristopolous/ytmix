var 
  db = DB(), 
  each = _.each,
  map = _.map,
  extend = _.extend,
  ev = EvDa({
    'app.state': '',
    'playlist.name': '',
    'search.related': [],
    'search.results': [],
    'active.track': {},
    'search.query': ''
  }),
  _get = function(a){ 
    try {
      return document.getElementById(a) 
    } catch (ex) {
      var div = document.body.appendChild(document.createElement('div'));
      div.setAttribute('id', a);
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

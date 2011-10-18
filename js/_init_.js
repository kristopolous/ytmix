var 
  db = DB(), 
  each = _.each,
  extend = _.extend,
  ev = EvDa({
    'app.state': 'splash',
    'playlist.name': '',
    'search.results': [],
    'search.query': ''
  }),
  _video = {
    width: 130 + 4 * 2 + 4 * 2,
    height: 106 + 8 * 2 + 4 * 2,
    old: {start: 0, stop: 0, query: ''}
  },
  _remote = {
    active: false,
    queue: []
  };

db.constrain('unique', 'ytid');
/*
ev.sniff();
ev.sniff('tick');
*/

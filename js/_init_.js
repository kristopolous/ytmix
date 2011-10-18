var 
  db = DB(), 
  each = _.each,
  extend = _.extend,
  ev = EvDa({
    'app.state': 'splash',
    'playlist.name': ''
  }),
  _video = {
    width: 130 + 4 * 2 + 4 * 2,
    height: 106 + 8 * 2 + 4 * 2,
    old: {start: 0, stop: 0}
  };

db.constrain('unique', 'ytid');
/*
ev.sniff();
ev.sniff('tick');
*/

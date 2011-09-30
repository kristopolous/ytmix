var 
  db = DB(), 
  each = _.each,
  extend = _.extend,
  ev = EvDa({
    'app.state': 'splash',
    'playlist.name': ''
  });

db.constrain('unique', 'ytid');
/*
ev.sniff();
ev.sniff('tick');
*/

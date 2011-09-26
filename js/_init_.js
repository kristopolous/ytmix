var 
  db = DB(), 
  ev = EvDa({
    'app.state': 'splash',
    'playlist.name': ''
  });

db.constrain('unique', 'ytid');
/*
ev.sniff();
ev.sniff('tick');
*/

var 
  db = DB(), 
  START = (+new Date()),
  each = _.each,
  UNIQ = 0,
  map = _.map,
  extend = _.extend,
  ev = EvDa({
    'app_state': '',
    'name': '',
    'blacklist': [],
    'search_related': [],
    'search_results': [],
    'search_query': '',
    'active_track': {}
  }),
  _epoch = 1334106009061,
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
  id: (function(){ return UNIQ++ }),
  reference: [],
  removed: 0
});

db.addIf(function(what) {
  return ev('blacklist').indexOf(what.ytid) == -1;
});

/*
var sCount = 0;
db.sync(function(){

  console.log(Utils.stack());
  console.log(++sCount, +new Date());
});

ev.sniff();
ev.sniff('tick');
*/

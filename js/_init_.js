var 
  _db = DB(), 
  START = (+new Date()),
  Splash = {},
  DL_real = DamerauLevenshtein({}, false),
  CLOCK_FREQ = 150,
  QUALITY_LEVELS = ['large', 'medium', 'small', 'tiny'],
  // How long to wait before forcing a reload of a video
  RELOAD_THRESHOLD = 6500,
  each = _.each,
  slice = Array.prototype.slice,
  UNIQ = 0,
  map = _.map,
  extend = _.extend,
  ev = EvDa({
    'volume': 100,
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

function DL(title_array, lhs, rhs) {
  var ret = DL_real(lhs, rhs);
  console.log(title_array.join(':') + "(" + ret + ")", lhs, ':', rhs);
  return ret;
}

_db.constrain('unique', 'ytid');
_db.template.create({
  id: (function(){ return UNIQ++ })
});

_db.addIf(function(what) {
  return ev('blacklist').indexOf(what.ytid) == -1;
});

_db.beforeAdd(function(what) {
  what.length = parseInt(what.length, 10);
});

ev.sniff();
ev.sniff('tick');
ev.sniff('deadair');
ev.sniff('');


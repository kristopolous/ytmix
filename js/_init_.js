var 
  _db = DB(), 
  START = +new Date(),
  Splash = {},
  isMobile = navigator.userAgent.search(/mobile/i) != -1 || $(document).width() < 768,
  DL_real = DamerauLevenshtein({}, false),
  CLOCK_FREQ = 150,
  QUALITY_LEVELS = ['large', 'medium', 'small', 'tiny'],
  // How long to wait before forcing a reload of a video
  RELOAD_THRESHOLD = 6500,
  slice = Array.prototype.slice,
  Template = {},
  UNIQ = 0,
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
  _video = {
    height: isMobile ? (36 + 8 + 4) : (89 + 8 + 8),
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

_db.main = _db;

ev.sniff('tick', 'deadair');


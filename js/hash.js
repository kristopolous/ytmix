var Hash = (function(){
  ev({
    'playlist_id': function(id) { 
      if(ev('playlist_name')) {
        set({
          name: ev('playlist_name'),
          id: id
        }); 
      }
    },
    'playlist_name': function(name) { 
      if(ev('playlist_id')) {
        set({
          id: ev('playlist_id'),
          name: name
        }); 
      }
    },
    'hash': function(hash) {
      if(hash.id) {
        if(hash.id != ev('playlist_id')) {
          Store.get(parseInt(hash.id));
        }
      } else {
        ev('app_state','splash');
      }
    }
  });

  function getHash(){
    var 
      raw = document.location.hash.substr(1),
      pieces = raw.split('/');
    
    return {
      raw: raw,
      id: pieces[0] || '',
      name: pieces[1] || ''
    };
  }

  function hashCheck() {
    var hash = getHash();

    if(ev('hash') && (ev('hash').raw != hash.raw)){
      return ev('hash', hash);
    }
  }

  function set(opts) {
    return setHash(extend(
      getHash(),
      opts
    ));
  }

  function setHash(obj) {
    document.location.hash = [obj.id, obj.name].join('/');
    return hashCheck();
  }

  ev('hash', getHash());
  setInterval(hashCheck, 250);
  
})();

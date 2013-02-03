var Hash = (function(){
  ev({
    'id': function(id) { 
      if(ev('name')) {
        set({
          name: ev('name'),
          id: id
        }); 
      }
    },
    'name': function(name) { 
      if(ev('id')) {
        set({
          id: ev('id'),
          name: name
        }); 
      }
    },
    'hash': function(hash) {
      if(hash.id) {
        if(hash.id != ev('id')) {
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

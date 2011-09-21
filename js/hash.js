var Hash = (function(){
  ev.when('playlist.id', function(id) {
    set({id : id});
  });

  ev.when('playlist.name', function(name) {
    set({name: name});
  });
  
  ev.when('hash', function(hash) {
    Store.get(parseInt(hash.id));
  });

  function hashCheck() {
    var hash = getHash();

    if(ev.get('hash').raw != hash.raw){
      return ev.set('hash', hash);
    }
  }

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

  function set(opts) {
    return setHash(_.extend(
      getHash(),
      opts
    ));
  }

  function setHash(obj) {
    document.location.hash = [obj.id, obj.name].join('/');
    return hashCheck();
  }

  ev.set('hash', getHash());
  setInterval(hashCheck, 250);
  
})();

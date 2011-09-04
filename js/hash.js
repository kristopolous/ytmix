var Hash = (function(){
  var ev = EvDa();

  function tuples(string){
    var 
      tuples = string.split(/[&=]/),
      kv = {},
      ix;

    if(tuples.length > 1) {
      for(ix = 0; ix < tuples.length; ix += 2) {
        kv[tuples[ix]] = tuples[ix + 1];
      }
    }

    return kv;
  }

  setInterval(function(){
    var hashStr = document.location.hash.substr(1);

    if(ev.get('hash.string') != hashStr){
      ev.set('hash.string', hashStr);

      each(tuples(hashStr), function(key, value) {
        if( ev.get(':' + key) != value ) {
          ev.set(':' + key, value);
        }
      });
    }
  });
  
})();

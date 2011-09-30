var Evda_ = EvDa;
EvDa = function(){
  var E = Evda_.apply(0, _.toArray(arguments));

  E.unset_ = E.unset;

  return _.extend(E, {
    unset: function () { for(var i = 0; i < arguments.length; E.unset_(arguments[i++])); },

    incr: function ( key ) {
      // we can't use the same trick here because if we
      // hit 0, it will auto-increment to 1
      return E.set ( key, _.isNumber(E.db[key]) ? (E.db[key] + 1) : 1 );
    },

    sniff: function () {
      E.set_ = E.set;
      var ignoreMap = {};

      E.set = function() {
        var args = Array.prototype.slice.call(arguments);
        if(!ignoreMap[args[0]]) {
          console.log(+new Date(), args);
        }
        E.set_.apply (this, args);
      }

      // neuter this function but don't populate
      // the users keyspace.
      E.sniff = function(key) {
        if(key) {
          ignoreMap[key] = !ignoreMap[key];
          return "[Un]ignoring " + key;
        } else {
          console.log(_.keys(ignoreMap));
        }
      }
    },

    decr: function ( key ) {
      // if key isn't in data, it returns 0 and sets it
      // if key is in data but isn't a number, it returns NaN and sets it
      // if key is 1, then it gets reduced to 0, getting 0,
      // if key is any other number, than it gets set
      return E.set ( key, E.db[key] - 1 || 0 );
    },

    // If we are pushing and popping a non-array then
    // it's better that the browser tosses the error
    // to the user than we try to be graceful and silent
    // Therein, we don't try to handle input validation
    // and just try it anyway
    push: function ( key, value ) {
      E.db[key] = E.db[key] || [];
      E.db[key].current = E.db[key].push ( value );
      
      return E.set ( key, E.db[key] );
    },

    pop: function ( key ) {
      E.db[key].pop ();
      E.db[key].current = _.last(E.db[key]);

      return E.set ( key, E.db[key] );
    },

    once: function ( key, lambda ) {
      return E ( key, lambda, { once: true } );
    },

    find: function ( regex ) {
      return _.select( _.keys(E.db), function(toTest) {
        return toTest.match(regex);
      });
    }
 });
}

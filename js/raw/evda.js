function EvDa (map) {
  var 
    // Underscore shortcuts ... pleases the minifier
    each = _.each,
    extend = _.extend,
    isObject = _.isObject,
    size = _.size,

    // Constants
    ON = 'on',
    AFTER = 'after',

    // The one time callback gets a property to
    // the end of the object to notify our future-selfs
    // that we ought to remove the function.
    ONCE = {once:1},

    // Internals
    data = map || {},
    setterMap = {},
    eventMap = {};

  function pub ( scope, value, meta ) {
    // If there was one argument, then this is
    // either a getter or the object style
    // invocation.
    if ( size(arguments) == 1 ) {

      // The object style invocation will return
      // handles associated with all the keys that
      // went in. There *could* be a mix and match
      // of callbacks and setters, but that would
      // be fine I guess...
      if( isObject(scope) ) {
        var ret = {};

        // Object style should be executed as a transaction
        // to avoid ordinals of the keys making a substantial
        // difference in the existence of the values
        each( scope, function( _value, _key ) {
          ret[_key] = pub ( _key, _value, meta, 0, 1 );
        });

        each( ret, function( _value, _key ) {
          if(_.isFunction(ret[_key]) && !_.isFunction(scope[_key])) {
            scope[_key] = ret[_key]();
          }
        });

        return scope;
      } else if (_.isArray(scope)) {
        return _.map(scope, function(which) {
          return pub(which, value, meta);
        });
      }

      return data[ scope ];
    } 

    // If there were two arguments and if one of them was a function, then
    // this needs to be registered.  Otherwise, we are setting a value.
    return pub [ _.isFunction ( value ) ? ON : 'set' ].apply(this, arguments);
  }

  // Register callbacks for
  // test, on, and after.
  each ( [ON, AFTER, 'test'], function ( stage ) {

    // register the function
    pub[stage] = function ( key, callback, meta ) {

      // This is the back-reference map to this callback
      // so that we can unregister it in the future.
      (callback.$ || (callback.$ = [])).push ( stage + key );

      (eventMap[stage + key] || (eventMap[stage + key] = [])).push ( callback );

      return extend(callback, meta);
    }
  });

  function del ( handle ) {
    each ( handle.$, function( stagekey ) {
      eventMap[ stagekey ] = _.without( eventMap[ stagekey ], handle );
    });
  }

  function isset ( key, callback ) {
    if( isObject(key) ) {

      each( key, function( _value, _key ) {
        key[_key] = isset( _key, _value );
      });

      return key;
    }

    // If I know how to set this key but
    // I just haven't done it yet, run through
    // those functions now.

    if( setterMap[key] ) {
      setterMap[key]();

      // This is functionally the same as a delete
      // for our purposes.  Also, this should not
      // grow enormous so it's an inexpensive 
      // optimization.
      setterMap[key] = 0;
    }

    if ( callback ) {
      return key in data ?
        callback ( data[key] ) :
        pub ( key, callback, ONCE );
    }

    return key in data;
  };

  return extend(pub, {
    // Exposing the internal variables so that
    // extensions can be made.
    db: data,
    events: eventMap,
    unset: function(key) { delete data[key]; },
    del: del,
    isset: isset,

    // Unlike much of the reset of the code,
    // setters have single functions.
    setter: function ( key, callback ) {
      setterMap[key] = callback;

      if (eventMap['on' + key]) {
        isset( key );
      }
    },

    set: function (key, value, _meta, bypass, _noexecute) {
      var 
        testKey = 'test' + key,
        times = size(eventMap[ testKey ]),
        failure,

        // Invoke will also get done
        // but it will have no semantic
        // meaning, so it's fine.
        meta = {
          meta: _meta || {},
          old: data[key],
          key: key,
          done: function ( ok ) {
            failure |= (ok === false);

            if ( ! --times ) {
              if ( ! failure ) { 
                pub.set ( key, value, _meta, 1 );
              }
            }
          }
        };

      if (times && !bypass) {
        each ( eventMap[ testKey ], function ( callback ) {
          callback ( value, meta );
        });
      } else {
        // Set the key to the new value.
        // The old value is beind passed in
        // through the meta
        data[key] = value;

        var cback = function(){
          each(
            (eventMap[ON + key] || []).concat
            (eventMap[AFTER + key] || []), 
            function(callback) {

              if(!callback.S) {
                callback ( value, meta );

                if ( callback.once ) {
                  del ( callback );
                }
              }
            });
          return value;
        }

        if(!_noexecute) {
          return cback();
        } else {
          return cback;
        }
      }

      return value;
    }
  });
}

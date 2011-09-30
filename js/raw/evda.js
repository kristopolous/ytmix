function EvDa (map) {
  var 
    // Underscore shortcuts ... pleases the minifier
    each = _.each,
    extend = _.extend,
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
      if( _.isObject(scope) ) {

        each( scope, function( _value, _key ) {
          scope[_key] = pub ( _key, _value, meta );
        });

        return scope;
      }

      return data[ scope ];
    } 

    // If there were two arguments and if one of them was a function, then
    // this needs to be registered.  Otherwise, we are setting a value.
    return pub [ _.isFunction ( value ) ? ON : 'set' ] ( scope, value, meta );
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

    set: function (key, value, _meta, bypass) {
      var 
        Key = 'test' + key,
        times = size(eventMap[ Key ]),
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
        each ( eventMap[ Key ], function ( callback ) {
          callback ( value, meta );
        });
      } else {
        // Set the key to the new value.
        // The old value is beind passed in
        // through the meta
        data[key] = value;

        each(
          (eventMap[ON + key] || []).concat
          (eventMap[AFTER + key] || []), 
          function(callback) {

            callback ( value, meta );

            if ( callback.once ) {
              del ( callback );
            }
          });
      }

      return value;
    }
  });
}

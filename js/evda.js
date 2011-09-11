function EvDa () {
  var 
    // Underscore shortcuts ... pleases the minifier
    each = _.each,
    keys = _.keys,
    extend = _.extend,
    flatten = _.flatten,

    // Internals
    data = {},
    funHandle = 0,
    funMap = {},
    hook = ['test', /* 'before', */ 'when', 'after' /*, 'finally' */ ],
    stageMap = {},
    keyCheck = {};

  function Invoke ( key, value, meta ) {
    var 
      old = data[key],
      callback,
      runList,
      result = {};

    data[key] = value;

    each( hook, function(stage) {
      runList = stageMap[stage][key];

      // Runlist is an array
      each(runList, function(callback, index) {

        result[ index ] = callback ( value, {
          meta: meta,
          old: old,
          current: value,
          key: key,
          remove: function () {
            // we just set a flag here to
            // maintain index integrity
            callback.rm = true;
          }

        });
      });

      each(runList, function(callback) {
        if ( callback.rm ) {
          remove ( callback );
        }
      });
    });

    keyCheck[key] = false;
    return result;
  }

  function Test ( key, value, meta ) {
    var  
      times = stageMap.test[key].length,
      failure = 0;

    function check ( ok ) {
      times --;
      failure += (ok === false);

      if ( ! times ) {
        if ( ! failure ) { 
          Invoke ( key, value, meta );
        }

        keyCheck[key] = false;
      }
    }

    each ( stageMap.test[key], function ( callback ) {
      callback ( value, {
        meta: meta,
        old: data[key],
        callback: check,
        key: key,
        remove: function () {
          remove ( callback );
        }
      });
    });
  }

  function register ( callback ) {
    callback.refs = [];
    funMap[ callback.ix = ++funHandle ] = callback;
  }

  function run ( keyList, value, meta ) {
    var result = {};

    each ( flatten([ keyList ]), function ( key ) {
      if ( ! keyCheck[key] ) {
      
        keyCheck[key] = true;

        result[key] = stageMap.test[key] ?
          Test ( key, value, meta ) :
          Invoke ( key, value, meta );
      }
    });

    return result;
  }

  function remove ( handle ) {
    each ( handle.refs, function ( tuple ) {
      var
        stage = tuple[0],
        key = tuple[1];

      stageMap[stage][key] = 
        _.without( stageMap[stage][key], handle );
    });

    delete funMap[handle.ix];
  }

  function chain ( obj ) {
    var context = {};

    if ( !obj.scope ) {
      obj.scope = [];
    } else {
      obj.scope = [obj.scope];
    }

    obj.meta = obj.meta || [];

    each ( keys ( pub ), function ( func ) {
      context[func] = function () {
        
        pub[func].apply ( this, 
          obj.scope.concat ( 
            _.toArray ( arguments ), 
            obj.meta 
          ) 
        );

        return context;
      }
    });

    return context;
  }


  function pub ( scope, value ) {
    var 
      len = arguments.length,
      context = {};

    if ( len == 0 ) {
      return [data, stageMap];
    }

    if ( _.isObject(scope) ) {

      each( scope, function( _value, _key ) {
        context[_key] = pub ( _key, _value );
      });

      return context;
    }

    if ( len == 1 ) {
      if( scope.search(/[*?]/) + 1 ) {
        return _.select( keys(data), function(toTest) {
          return toTest.match(scope);
        });
      }

      return data[ scope ];
    } 

    context = chain ({ scope: scope });
     
    if ( _.isFunction ( value ) ) {
      context.when ( value );
    } else if ( len > 1 ){
      context.run ( value );
    }

    return context;
  }

  each ( hook, function ( stage ) {
    stageMap[stage] = {};

    pub[stage] = function ( keyList, callback ) {

      register ( callback );

      each ( flatten([ keyList ]), function ( key ) {

        stageMap[stage][key] = 
          (stageMap[stage][key] || []).concat(callback);

        callback.refs.push ( [stage, key] );
      });

      return extend ( 
        pub,
        { handle: callback }
      );
    }
  });

  // remove the test
  hook.shift();

  return extend(pub, {
    // If we are pushing and popping a non-array then
    // it's better that the browser tosses the error
    // to the user than we try to be graceful and silent
    // Therein, we don't try to handle input validation
    // and just try it anyway
    push: function ( key, value ) {
      data[key] = data[key] || [];
      data[key].current = data[key].push ( value );
      
      return run ( key, data[key] );
    },

    pop: function ( key ) {
      data[key].pop ();
      data[key].current = _.last(data[key]);

      return run ( key, data[key] );
    },

    once: function ( key, callback ) {
      var ret = pub.when ( key, callback );

      ret.handle.rm = true;
      return ret;
    },

    decr: function ( key ) {
      // if key isn't in data, it returns 0 and sets it
      // if key is in data but isn't a number, it returns NaN and sets it
      // if key is 1, then it gets reduced to 0, getting 0,
      // if key is any other number, than it gets set
      return run ( key, data[key] - 1 || 0 );
    },

    incr: function ( key ) {
      // we can't use the same trick here because if we
      // hit 0, it will auto-increment to 1
      return run ( key, _.isNumber(data[key]) ? (data[key] + 1) : 1 );
    },

    isset: function ( key, callback ) {
      if ( ! (key in data) ) {
        if( callback ) {
          return pub.once ( key, callback );
        }
      }

      if( callback ) {
        callback ( data[key] );
      }

      return key in data;
    },

    /* share: function ( prop ) { return chain ({ meta: prop }); }, */

    run: run,
    emit: run,
    get: pub,
    set: function(k, v) {
      if(arguments.length == 1) { 
        v = true;
      } 
      return pub(k, v);
    },
    unset: function(key) {
      // unset doesn't hook
      delete data[key];
    },
    remove: remove
  });
}

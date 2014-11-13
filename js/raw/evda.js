//
// EvDa Events and Data v1.0
// https://github.com/kristopolous/EvDa
//
// Copyright 2011 - 2014 Chris McKenzie
// Dual licensed under the MIT or GPL Version 2 licenses.
//
function EvDa (imported) {
  var 
    BASE = '__base',
    slice = Array.prototype.slice,  

    // This is mostly underscore functions here. But they are included to make sure that
    // they are supported here without requiring an additional library. 
    //
    // underscore {
    toString = Object.prototype.toString,
    isArray = [].isArray || function(obj) { return toString.call(obj) === '[object Array]' },
    isFunction = function(obj) { return !!(obj && obj.constructor && obj.call && obj.apply) },
    isString = function(obj) { return !!(obj === '' || (obj && obj.charCodeAt && obj.substr)) },
    isNumber = function(obj) { return toString.call(obj) === '[object Number]' },
    isObject = function(obj) {
      if(isFunction(obj) || isString(obj) || isNumber(obj) || isArray(obj)) {
        return false;
      }

      return obj == null ? 
        String( obj ) == 'object' : 
        toString.call(obj) === '[object Object]' || true ;
    },

    toArray = function(obj) {
      return slice.call(obj);
    },

    each = [].forEach ?
      function (obj, cb) {
        if (isArray(obj) || obj.length) { 
          toArray(obj).forEach(cb);
        } else {
          for( var key in obj ) {
            cb(key, obj[key]);
          }
        }
      } :

      function (obj, cb) {
        if (isArray(obj)) {
          for ( var i = 0, len = obj.length; i < len; i++ ) { 
            cb(obj[i], i);
          }
        } else {
          for( var key in obj ) {
            cb(key, obj[key]);
          }
        }
      },

    last = function(obj) {
      return obj.length ? obj[obj.length - 1] : undefined;
    },

    keys = ({}).keys || function (obj) {
      if(isArray(obj)) { 
        return obj;
      }
      var ret = [];

      for(var key in obj) {
        ret.push(key);
      }

      return ret;
    },

    without = function(collection, item) {
      var ret = [];
      each(collection, function(which) {
        if(which !== item) {
          ret.push(which);
        }
      });
      return ret;
    },

    uniq = function(obj) {
      var 
        old, 
        ret = [];

      each(keys(obj).sort(), function(which) {
        if(which != old) {
          old = which;
          ret.push(which);
        }
      });
      return ret;
    },

    select = function(obj, test) {
      var ret = [];
      each(obj, function(which) {
        if(test(which)) { ret.push (which); }
      });
      return ret;
    },

    size = function(obj) {
      return (obj && 'length' in obj) ? obj.length : 0;
    },

    map = [].map ?
      function(array, cb) { 
        return array.map(cb) 
      } : 

      function(array, cb) {
        var ret = [];

        for ( var i = 0, len = array.length; i < len; i++ ) { 
          ret.push(cb(array[i], i));
        }

        return ret;
      },

    clone = function(obj) {
      if(isArray(obj)) { return slice.call(obj); }
      if(isObject(obj)) { return extend(obj, {}); }
      return obj;
    },

    extend = function(obj) {
      each(slice.call(arguments, 1), function(source) {
        for (var prop in source) {
          if (source[prop] !== void 0) {

            // This recursively assigns
            if ( isObject(source[prop]) && isObject(obj[prop]) ) {
              extend(obj[prop], source[prop]);
            } else {
              obj[prop] = source[prop];
            }
          }
        }
      });
      return obj;
    },
    
    // } end of underscore style functions.

    // Constants
    FIRST = 'first',
    ON = 'on',
    AFTER = 'after',

    // The one time callback gets a property to
    // the end of the object to notify our future-selfs
    // that we ought to remove the function.
    ONCE = {once: 1},

    // Internals
    data = imported || {},

    // the backlog to execute if something is paused.
    backlog = [],
    setterMap = {},
    globberMap = {},
    eventMap = {};

  function isGlobbed(str) {
    return str.match(/[?*]/);
  }

  // This looks to see if a key has a globbing parameter, such
  // as ? or * and then return it
  function glob(key, context) {
    if(isGlobbed(key)) {
      return select(keys(context ? context : data), function(what) {
        return what.match(key);
      });
    }
    return key;
  }

  // This uses the globbing feature and returns
  // a "smart" map which is only one element if
  // something matches, otherwise a map 
  function smartMap(what, cback) {
    var ret = {};
    if(isArray(what)) {
      each(what, function(field) {
        ret[what] = cback(what);
      });
      return ret;

    } else {
      return cback(what);
    }
  }
  
  // This is the main invocation function. After
  // you declare an instance and call that instance
  // as a function, this is what gets run.
  function pub ( scope, value, meta ) {

    // If there are no arguments, and this is useful in the browser
    // debug console, return all the internal data structures.
    if ( arguments.length === 0 ) {
      return {
        data: data, 
        setters: setterMap, 
        events: eventMap,
        globs: globberMap
      };
    }

    // If there was one argument, then this is
    // either a getter or the object style
    // invocation.
    if ( isArray(scope) ) {
      var args = slice.call(arguments, 1);

      return map(scope, function(which) {
        return pub.apply(pub.context, [which].concat(args));
      });
    }
    if ( arguments.length == 1 ) {

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
        each( scope, function( _key, _value ) {
          ret[_key] = pub ( _key, _value, meta, 0, 1 );
        });

        // After the callbacks has been bypassed, then we
        // run all of them a second time, this time the
        // dependency graphs from the object style transactional
        // invocation should be satisfied
        each( ret, function( _key, _value ) {
          if(isFunction(ret[_key]) && !isFunction(scope[_key])) {
            scope[_key] = ret[_key]();
          }
        });

        // TODO: fix this
        bubble( keys(ret)[0] );

        return scope;
      }

      return smartMap(scope, function(what) { 
        return data[ what ];
      });
    } 

    // If there were two arguments and if one of them was a function, then
    // this needs to be registered.  Otherwise, we are setting a value.
    return pub [ isFunction ( value ) ? ON : 'set' ].apply(this, arguments);
  }

  // Register callbacks for
  // test, on, after, and or.
  each ( [FIRST, ON, AFTER, 'test', 'or'], function ( stage ) {

    // register the function
    pub[stage] = function ( key, callback, meta ) {
      var map = eventMap;

      if ( !callback ) {
        callback = key;
        key = BASE;
      }

      // This is the back-reference map to this callback
      // so that we can unregister it in the future.
      (callback.$ || (callback.$ = [])).push ( stage + key );

      if (isGlobbed(key)) {
        map = globberMap;
      }

      (map[stage + key] || (map[stage + key] = [])).push ( callback );

      return extend(callback, meta);
    }
  });

  function del ( handle ) {
    each ( handle.$, function( stagekey ) {
      var map = isGlobbed(stagekey) ? globberMap : eventMap;
      map[ stagekey ] = without( map[ stagekey ], handle );
    });
  }

  function isset ( key, callback, meta ) {
    // This supports the style
    // ev.isset(['key1', 'key2'], something).
    //
    // Since they all need to be set, then it doesn't really matter
    // what order we trigger things in.  We don't have to do any crazy
    // accounting, just cascading should do fine.
    if ( isArray(key) ) {
      var myKey = key.pop();

      return isset(glob(myKey), function(data, meta) {
        var next = (key.length == 1) ? key[0] : key;
        return isset(next, callback, meta);
      }, meta);
      // ^^ this should recurse nicely.
      // It uses the meta feature to
      // aggregate the k/v pairs as it goes through them.
      
    } 

    // This supports the style of 
    // ev.isset({
    //   key1: something,
    //   key2: something
    // })
    if( isObject(key) ) {

      each( key, function( _key, _value ) {
        if(isGlobbed(_key)) {
          extend(_key, 
            smartMap(_key, function(_what){
              return isset(_key, _value, meta);
            })
          );
        } else {
          key[_key] = isset( _key, _value, meta );
        }
      });

      // Return the entire object as the result
      return key;

    } 

    // If I know how to set this key but
    // I just haven't done it yet, run through
    // that function now.
    if( setterMap[key] ) {
      // If someone explicitly sets the k/v in the setter
      // that is fine, that means this function isn't run.
      //
      // NOTE: using the return value as the thing to be set is a bad idea
      // because things can be done asynchronously.  So there is no way to
      // reliably check if the code explicitly set things after the function
      // returns.
      
      /* var ThisIsWorthless = */ setterMap[key](function(value) {
        pub.set.call(pub.context, key, value, meta);
      });

      delete setterMap[key];
    }

    if ( callback ) {
      // If it already exists, then just call the function
      // that came in.
      //
      // Otherwise have it called once on a set. This means
      // that the setter is inherently asynchronous since
      // the execution of this function is continued to be
      // blocked until the key is set.
      return key in data ?
        callback.call ( pub.context, data[key], meta ) :
        pub ( key, callback, extend( meta || {}, ONCE ) );
    }

    // Otherwise, if there is no callback, just return
    // whether this key is defined or not.
    return key in data;
  };

  function runCallback(callback, context, value, meta) {
    if( ! callback.S) {
      // our ingested meta was folded into our callback
      callback.call ( 
        context, 
        value, 
        meta
      );

      if ( callback.once ) {
        del ( callback );
      }
    }
  }

  function bubble(key) {
    var
      parts = key.split('.'),
      parts_key = parts.pop();
      parts_obj = [];

    parts_obj[parts_key] = data[key];

    // we then extend the value into the group.
    pub.extend.apply(
      pub.context,
      [
        parts.join('.'),
        parts_obj
      ].concat(
        slice.call(arguments, 1)
      )
    );
  }

  extend(pub, {
    // Exposing the internal variables so that
    // extensions can be made.
    _: {},
    context: this,
    list: {},
    isPaused: false,
    db: data,
    setterMap: setterMap,
    events: eventMap,
    del: del,
    whenSet: isset,
    isset: isset,

    pause: function() {
      if(!pub.isPaused) {
        pub.isPaused = true;
        pub._.set = pub.set;
        pub.set = function() {
          backlog.push(['set', arguments]);
        }
        return true;
      }
      return false;
    }, 

    play: function() {
      if(pub.isPaused) {
        // first we take it off being paused
        pub.isPaused = false;

        // now we make a mock evda
        var mock = EvDa();

        // unswap out our dummy functions
        pub.set = pub._.set;

        // And we run the backlog on it (with no events firing of course)
        each(backlog, function(row) {
          mock[row[0]].apply(mock, row[1]);
        });
        // clear the backlog
        backlog = [];

        // now we invoke the mock database over our own
        pub(mock.db);

        return true;
      }
      return false;
    },

    // Unlike much of the reset of the code,
    // setters have single functions.
    setter: function ( key, callback ) {
      setterMap[key] = callback;

      // If I am setting a setter and
      // a function is already waiting on it,
      // then run it now.
      if (eventMap[ON + key]) {
        return isset( key );
      }
    },

    when: function ( key, toTest, lambda ) {
      // See if toTest makes sense as a block of code
      // This may have some drastically unexpected side-effects.
      if ( isString(toTest) ) {
        try {
          var attempt = new Function("x", "return x" + toTest);

          // If this doesn't throw an exception,
          // we'll call it gold and then make the function
          // our test case
          attempt();

          toTest = attempt;
        } catch (ex) { }
      }

      return pub(key, function(value) {
        if(
          // Look for identical arrays by comparing their string values.
          ( isArray(toTest)    && toTest.sort().join('') === value.sort().join('') ) ||

          // otherwise, Run a tester if that is defined
          ( isFunction(toTest) && toTest(value) ) ||

          // Otherwise, try a triple equals.
          ( value === toTest ) 
        ) {
          lambda.call(pub.context, value);
        }
      });
    },

    empty: function() {
      // we want to maintain references to the object itself
      for (var key in data) {
        delete data[key];
      }
    },

    incr: function ( key, amount ) {
      amount = amount || 1;
      // we can't use the same trick here because if we
      // hit 0, it will auto-increment to amount
      return pub.set ( key, isNumber(data[key]) ? (data[key] + amount) : amount );
    },

    decr: function ( key, amount ) {
      amount = amount || 1;
      // if key isn't in data, it returns 0 and sets it
      // if key is in data but isn't a number, it returns NaN and sets it
      // if key is 1, then it gets reduced to 0, getting 0,
      // if key is any other number, than it gets set
      return pub.set ( key, data[key] - amount || 0 );
    },

    // If we are pushing and popping a non-array then
    // it's better that the browser tosses the error
    // to the user than we try to be graceful and silent
    // Therein, we don't try to handle input validation
    // and just try it anyway
    push: function ( key, value ) {
      if (size(arguments) == 1) {
        value = key;
        key = BASE;
      }

      return pub.set ( key, [].concat(data[key] || [], [value]) );
    },

    pop: function ( key ) {
      return pub.set ( key || BASE, data[key].slice(0, -1) );
    },

    traceList: [],

    group: function ( list ) {
      var 
        opts = toArray(arguments),
        list = opts.shift(),
        ret = pub.apply(0, opts);

      ( pub.list[list] || (pub.list[list] = []) );

      if(isFunction(ret)) {
        pub.list[list].push(ret);
      } else {
        each(ret, function(value, key) {
          pub.list[list].push(value);
        });
      } 
      return function() {
        return pub.group.apply(0, [list].concat(toArray(arguments)));
      }
    },

    extend: function (key, value) {
      return pub.set.apply(
        pub.context, [
          key, 
          extend({}, (data[key] || {}), value)
        ].concat(
          slice.call(arguments, 2)
        )
      );
    },

    set: function (key, value, _meta, bypass, _noexecute) {
      var 
        testKey = 'test' + key,
        result,
        args = slice.call(arguments),
        times = size(eventMap[ testKey ]),
        doTest = (times && !bypass),
        failure,

        // Invoke will also get done
        // but it will have no semantic
        // meaning, so it's fine.
        meta = doTest ? (
          function ( ok ) {
            failure |= (ok === false);

            if ( ! --times ) { 
              if ( failure ) { 
                each ( eventMap[ "or" + key ] || [], function ( callback ) {
                  runCallback ( callback, pub.context, value, _meta );
                });
              } else {
                pub.set ( key, value, _meta, 1 );
              }
            }
            return ok;
          }
        ) : {};

      meta.old = clone(data[key]);

      extend(meta, {
        meta: _meta || {},
        done: meta, 
        result: meta,
        key: key
      });

      if (doTest) {
        // This is the test handlers
        each ( eventMap[ testKey ], function ( callback ) {
          callback.call ( pub.context, value, meta );
        });
        // Don't return the value...
        // return the current value of that key.
        // 
        // This is because keys can be denied
        result = data[key];
      } else {

        each ( pub.traceList, function ( callback ) {
          callback.call ( pub.context, args );
        });

        // Set the key to the new value.
        // The old value is being passed in
        // through the meta
        data[key] = value;

        var cback = function(){
          each(
            (eventMap[FIRST + key] || []).concat(
              (eventMap[ON + key] || []),
              (eventMap[AFTER + key] || []) 
            ),
            function(callback) {
              meta.last = runCallback(callback, pub.context, value, meta);
            });
          return value;
        }

        if(!_noexecute) {
          result = cback.call(pub.context);
        } else {
          // if we are not executing this, then
          // we return a set of functions that we
          // would be executing.
          result = cback;
        }
      } 

      // After this, we bubble up if relevant.
      if(key.length > 0) {
        bubble.apply(pub.context, [key].concat(slice.call(arguments, 2)));
      }

      return result;
    },

    fire: function ( key ) {
      pub.set ( key, data[key] );
    },

    once: function ( key, lambda, meta ) {
      // If this is a callback, then we can register it to be called once.
      if(lambda) {
        // Through some slight recursion.
        return pub.once( 
          // First we register it as normal.
          // Then we call the once with the 
          // handle, returning here
          pub ( key, lambda, meta )
          // And running the function below:
        );
      } 
      // This will add the k/v pair to the handler
      return extend( key, ONCE );
    },

    enable: function ( listName ) {
      each(pub.list[listName], function(callback) {
        if ( callback.S && callback.S[listName] ) {
          delete callback.S[listName];
        }

        if ( size(callback.S) == 0 ) {
          delete callback.S;
        }
      });
      return pub.list[listName];
    },

    setadd: function ( key, value ) {
      value = isArray(value) ? value : [value];

      var 
        before = data[key] || [],
        after = uniq( before.concat(value) );

      if ( before.length != after.length) {
        return pub ( key, after );
      }

      return after;
    },

    setdel: function ( key, value ) {

      var
        before = data[key] || [],
        after = without( before, value);

      if ( before.length != after.length) {
        return pub ( key, after );
      }

      return after;
    },

    disable: function ( listName ) {
      each(pub.list[listName], function(callback) {
        ( callback.S || (callback.S = {}) ) [ listName ] = true;
      });

      return pub.list[listName];
    },

    unset: function () { 
      var bool = true;
      each(arguments, function(which) {
        bool &= (which in data);
        delete data[which];
      });
      return bool;
    },

    find: function ( regex ) {
      return select( keys(data), function(toTest) {
        return toTest.match(regex);
      });
    },

    changed: function(key, callback) {
      if( !callback ) {
        callback = key;
        key = BASE;
      }

      return pub.on(key, function(value, meta) {
        var 
          newlen = size(value),
          oldlen = size(meta.old);
        
        if(newlen - oldlen == 1) {
          callback.call( pub.context, last(value) );
        } else if (newlen > oldlen) { 
          callback.call( pub.context, toArray(value).slice(oldlen) );
        }
      });
    },

    sniff: function () {
      var 
        ignoreMap = {},
        startTime = +new Date(),
        // Use a few levels of indirection to be
        // able to toggle the sniffing on or off.
        sniff = function(args) {
          if(!ignoreMap[args[0]]) {
            console.log((+new Date()) - startTime, args);
          }
        },
        dummy = function() {},
        sniffProxy = sniff;

      pub.traceList.unshift(function(args){
        sniffProxy(args);
      });
         
      // neuter this function but don't populate
      // the users keyspace.
      pub.sniff = function(key) {
        if(arguments.length > 0) {
          if(isString(key)) {
            ignoreMap[key] = !ignoreMap[key];
            return "[Un]ignoring " + key;
          } else {
            // If the key is true then we turn sniffing "on"
            // by linking the proxy to the real sniff function.
            //
            // Otherwise, we link the proxy to a dummy function
            sniffProxy = key ? sniff : dummy;
            return key;
          }
        } 
        return keys(ignoreMap);
      }
    }
  });

  pub.setAdd = pub.setadd;
  pub.setDel = pub.setdel;
  pub.isSet = pub.isset;

  pub.get = pub;
  pub.change = pub.on;
  pub.add = pub.push;

  pub.isArray = isArray;
  return pub;
}

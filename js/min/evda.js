function EvDa(s){function n(a,c,e){var j=b[a],f,d={};b[a]=c;g(l,function(b){f=h[b][a];g(f,function(b,f){d[f]=b(c,{meta:e,old:j,current:c,key:a,remove:function(){b.rm=!0}})});g(f,function(a){a.rm&&m(a)})});k[a]=!1;return d}function t(a,c,e){function d(b){f--;i+=b===!1;f||(i||n(a,c,e),k[a]=!1)}var f=h.test[a].length,i=0;g(h.test[a],function(f){f(c,{meta:e,old:b[a],callback:d,key:a,remove:function(){m(f)}})})}function u(a){a.refs=[];o[a.ix=++v]=a}function i(a,c,b){var d={};g(p([a]),function(a){k[a]||
(k[a]=!0,d[a]=h.test[a]?t(a,c,b):n(a,c,b))});return d}function m(a){g(a.refs,function(c){var b=c[0],c=c[1];h[b][c]=_.without(h[b][c],a)});delete o[a.ix]}function w(a){var c={};a.scope=a.scope?[a.scope]:[];a.meta=a.meta||[];g(q(d),function(b){c[b]=function(){d[b].apply(this,a.scope.concat(_.toArray(arguments),a.meta));return c}});return c}function d(a,c){var e=arguments.length,j={};if(e==0)return[b,h];if(_.isObject(a))return g(a,function(a,b){j[b]=d(b,a)}),j;if(e==1)return a.search(/[*?]/)+1?_.select(q(b),
function(b){return b.match(a)}):b[a];j=w({scope:a});_.isFunction(c)?j.when(c):e>1&&j.run(c);return j}var g=_.each,q=_.keys,r=_.extend,p=_.flatten,b=s||{},v=0,o={},l=["test","when","after"],h={},k={};g(l,function(a){h[a]={};d[a]=function(b,e){u(e);g(p([b]),function(b){h[a][b]=(h[a][b]||[]).concat(e);e.refs.push([a,b])});return r(d,{handle:e})}});l.shift();d.on=d.when;return r(d,{push:function(a,c){b[a]=b[a]||[];b[a].current=b[a].push(c);return i(a,b[a])},pop:function(a){b[a].pop();b[a].current=_.last(b[a]);
return i(a,b[a])},incr:function(a){return i(a,_.isNumber(b[a])?b[a]+1:1)},decr:function(a){return i(a,b[a]-1||0)},once:function(a,b){var e=d.when(a,b);e.handle.rm=!0;return e},isset:function(a,c){if(!(a in b)&&c)return d.once(a,c);c&&c(b[a]);return a in b},firstset:d.isset,run:i,emit:i,get:d,onset:d,set:function(a,b){arguments.length==1&&(b=!0);return d(a,b)},unset:function(a){delete b[a]},remove:m})};
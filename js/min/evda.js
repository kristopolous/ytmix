function EvDa(z){function c(a,b,d){if(1==arguments.length){if(u(a)){var h={};e(a,function(a,b){h[a]=c(a,b,d,0,1)});e(h,function(b){m(h[b])&&!m(a[b])&&(a[b]=h[b]())});return a}return q(a)?B(a,function(a){return c(a,b,d)}):f[a]}return c[m(b)?t:"set"].apply(this,arguments)}function x(a){e(a.$,function(b){g[b]=y(g[b],a)})}function r(a,b){if(u(a))return e(a,function(b,c){a[b]=r(b,c)}),a;k[a]&&(k[a](),k[a]=0);return b?a in f?b(f[a]):c(a,b,C):a in f}var n=Array.prototype.slice,p=Object.prototype.toString,
q=[].isArray||function(a){return"[object Array]"===p.call(a)},m=function(a){return!(!a||!a.constructor||!a.call||!a.apply)},u=function(a){return""===a||a&&a.charCodeAt&&a.substr?!1:null==a?"object"==String(a):"[object Object]"===p.call(a)||!0},e=[].forEach?function(a,b){if(q(a)||a.length)n.call(a).forEach(b);else for(var d in a)b(d,a[d])}:function(a,b){if(q(a))for(var d=0,c=a.length;d<c;d++)b(a[d],d);else for(d in a)b(d,a[d])},v={}.keys||function(a){if(q(a))return a;var b=[],d;for(d in a)b.push(d);
return b},y=function(a,b){var d=[];e(a,function(a){a!==b&&d.push(a)});return d},s=function(a){return a&&"length"in a?a.length:0},B=[].map?function(a,b){return a.map(b)}:function(a,b){for(var d=[],c=0,e=a.length;c<e;c++)d.push(b(a[c],c));return d},w=function(a){e(n.call(arguments,1),function(b){for(var d in b)void 0!==b[d]&&(a[d]=b[d])});return a},t="on",C={once:1},f=z||{},k={},g={};e([t,"after","test"],function(a){c[a]=function(b,d,c){d||(d=b,b="__base");(d.$||(d.$=[])).push(a+b);(g[a+b]||(g[a+b]=
[])).push(d);return w(d,c)}});w(c,{list:{},db:f,events:g,del:x,isset:r,setter:function(a,b){k[a]=b;g[t+a]&&r(a)},incr:function(a){return c.set(a,"[object Number]"===p.call(f[a])?f[a]+1:1)},decr:function(a){return c.set(a,f[a]-1||0)},push:function(a,b){1==s(arguments)&&(b=a,a="__base");return c.set(a,[].concat(f[a]||[],[b]))},pop:function(a){return c.set(a||"__base",f[a].slice(0,-1))},traceList:[],group:function(a){var b=n.call(arguments);a=b.shift();b=c.apply(0,b);c.list[a]||(c.list[a]=[]);m(b)?c.list[a].push(b):
e(b,function(b){c.list[a].push(b)});return function(){return c.group.apply(0,[a].concat(n.call(arguments)))}},set:function(a,b,d,h,A){var j="test"+a,D=n.call(arguments),m=s(g[j]),k,r=d||{},l;l=f[a];l=q(l)?n.call(l):u(l)?w(l,{}):l;var p={meta:r,old:l,key:a,done:function(e){k|=!1===e;--m||k||c.set(a,b,d,1)}};e(c.traceList,function(a){a(D)});if(m&&!h)e(g[j],function(a){a(b,p)});else return f[a]=b,j=function(){e((g[t+a]||[]).concat(g["after"+a]||[]),function(a){a.S||(a(b,p),a.once&&x(a))});return b},
A?j:j();return b},once:function(a,b){return c(a,b,{once:!0})},enable:function(a){e(c.list[a],function(b){b.S&&b.S[a]&&delete b.S[a];0==s(b.S)&&delete b.S})},setadd:function(a,b){var d=c,h=(f[a]||[]).concat([b]),g,j=[];e(v(h).sort(),function(a){a!=g&&(g=a,j.push(a))});return d(a,j)},setdel:function(a,b){return c(a,y(f[a]||[],b))},disable:function(a){e(c.list[a],function(b){(b.S||(b.S={}))[a]=!0})},unset:function(){e(arguments,function(a){delete f[a]})},find:function(a){var b=v(f),d=[];e(b,function(b){b.match(a)&&
d.push(b)});return d},added:function(a,b){b||(b=a,a="__base");c.on(a,function(a,c){var e=s(a),f=s(c.old);1==e-f?b(a.length?a[a.length-1]:void 0):e>f&&b(n.call(a).slice(f))})},sniff:function(){var a={},b=+new Date;c.traceList.unshift(function(d){a[d[0]]||console.log(+new Date-b,d)});c.sniff=function(b){return b?(a[b]=!a[b],"[Un]ignoring "+b):v(a)}}});c.change=c.on;c.add=c.push;return c};

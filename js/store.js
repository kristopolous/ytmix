
(function($){if(!$||!($.toJSON||Object.toJSON||window.JSON))
throw new Error("jQuery, MooTools or Prototype needs to be loaded before jStorage!");$.jStorage={version:"0.1.2",_storage:{},_storage_service:{jStorage:"{}"},_storage_elm:null,json_encode:$.toJSON||Object.toJSON||(window.JSON&&JSON.encode),json_decode:$.evalJSON||(window.JSON&&JSON.decode)||function(str){return String(str).evalJSON();},_init:function(){if("localStorage"in window){this._storage_service=window.localStorage;}
else if("globalStorage"in window){this._storage_service=window.globalStorage[document.domain]}
else{this._storage_elm=document.createElement('link')
if("addBehavior"in this._storage_elm){this._storage_elm.style.behavior='url(#default#userData)';document.getElementsByTagName('head')[0].appendChild(this._storage_elm);this._storage_elm.load("jStorage");try{var data=this._storage_elm.getAttribute("jStorage")}catch(E){var data="{}"}
if(data&&data.length){this._storage_service.jStorage=data;}}else{this._storage_elm=null;return;}}
if("jStorage"in this._storage_service&&this._storage_service.jStorage){try{this._storage=this.json_decode(this._storage_service.jStorage);}catch(E){this._storage_service.jStorage="{}";}}else{this._storage_service.jStorage="{}";}},_save:function(){if(this._storage_service){try{this._storage_service.jStorage=this.json_encode(this._storage);}catch(E){}
if(this._storage_elm){try{this._storage_elm.setAttribute("jStorage",this._storage_service.jStorage)
this._storage_elm.save("jStorage");}catch(E){}}}},_checkKey:function(key){if(!key||(typeof key!="string"&&typeof key!="number")){throw new TypeError('Key name must be string or numeric');}
return true;},set:function(key,value){this._checkKey(key);this._storage[key]=value;this._save();return value;},get:function(key,def){this._checkKey(key);if(key in this._storage)
return this._storage[key];return def?def:null;},deleteKey:function(key){this._checkKey(key);if(key in this._storage){delete this._storage[key];this._save();return true;}
return false;},flush:function(){this._storage={};this._save();return true;}}
$.jStorage._init();})(typeof jQuery!="undefined"&&jQuery||$);
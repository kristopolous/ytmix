<?
	$ret = Array();
	$vid = $_GET['v'];
if(!isset($_GET['a'])) {
	$r = Array(
		'vid' => $vid
	);
} else {
	$main_doc = new DOMDocument();
	$main_doc->preserveWhiteSpace = FALSE;
	@$main_doc->loadHTMLFile("http://www.youtube.com/watch?v=$vid");
	$nodelist = $main_doc->getElementsByTagName("title");
	foreach ($nodelist as $node) {
		$title = $node->nodeValue;
		$title = substr($title, 10);
		break;
	}
	$nodelist = $main_doc->getElementsByTagName("a");
	foreach ($nodelist as $node) {
		if($node->hasAttribute("class") && ($node->getAttribute('class') == 'video-list-item-link')) {
			$link = $node->getAttribute('href');
			if(strpos($link, 'watch?')) {
				
				$ret[] = Array(
					$node->childNodes->item(2)->getAttribute('title'),
					preg_replace('/^.*v=([^&]*).*/', '$1', $link)
				);

			}
		}
	}
	$r = Array(
		'vid' => $vid,
		'ttl' => $title,
		'rel' => $ret
	);
	if(isset($_GET['a'])) {
		echo json_encode($r);
		return;
	}
}
?>
<style>
a{color:white;cursor:pointer}
tt{color:silver;min-width:50px;display:inline-block}
a:hover{color:teal}
img{cursor:pointer;width:112px;height:90px;}
#vCon{width:58%;vertical-align:top}
#vCon > embed{display:none;position:relative}
#header *{cursor:pointer;display:inline-block;color:lime}
#top{position:fixed;top:0;left:0;background:#002;height:168px;width:100%}
#previewWrap{position:fixed;bottom:0px;right:0px;background-image:url(loader.gif)}
span{display:inline-block}
#history{width:41%;overflow:auto;height:100%;margin-bottom:-20px;display:inline-block}
#undo{position:fixed;top:0;right:0;padding:3px 10px;
font-family: 'Trebuchet MS', Helvetica, sans-serif;
font-weight:bold;
color:silver;
text-decoration:none;}
#undo:hover{color:#fff;background:#008;color:white}
#related{margin-top:170px}
#header tt{padding:0 3px;min-width:47px}
#header tt:hover{background:#008}
</style>
<body bgcolor=black>
<div id=top>
<span id=vCon></span>
<span id=history></span>
<span id=header><tt title="Sort By Last Seen" onclick=sort(AGE,this)>Age</tt><tt title="Sort By Times Seen" onclick=sort(COUNT,this)>Count</tt><tt style=background:#008 title="Sort Alphabetically" onclick=sort(ALPHA,this)>Name</tt></span>
</div>
<a id=undo style=color:#fff href=javascript:undo()>undo</a>
<div id=related></div>
<div id=previewWrap>
<img onload=upit(this) id=preview>
</div>
<script src=/q.js></script>
<script>
var rel=<?= json_encode($r) ?>,
	ALPHA = 0,
	COUNT = 1,
	AGE = 2,
	odder = 0,
	lastCnt,
	mod = 6,
	oldRel = rel,
	hist= [],
	current = 0,
	count = {},
	sortOrder = ALPHA,
	urlList = [],
	loadit,

	lastseen = {},
	map = {},
	el = {};

function upit(el) {
	$(el).css('opacity', 1);
}
function undo(){
	if(current > 1 ) {
		var ix;
		odder += mod - 1;
		odder %= mod;
		if(current > mod) {
			$("#vid" + odder).attr('src','http://www.youtube.com/v/'+ hist[hist.length - mod - 1].vid +'&hl=en&fs=1&autoplay=1').remove().prependTo($("#vCon")).css('display','inline-block');
		} else {
			$("#vid" + odder).css('display','none');
		}
		$(document.getElementById("history").lastChild).remove();
		$(document.getElementById("history").lastChild).remove();
		rel = oldRel;
		links = hist.pop();
		var len = links.rel.length;
		for(ix = 0; ix < len; ix++) {
			var url = links.rel[ix][1];
			count[url]--;
			if(count[url] == 0) {
				delete map[url];
				delete count[url];
				delete lastseen[url];
			} else {
				lastseen[url].shift();
			}
		}

		// rebuild the urlList
		var copy = urlList;
		len = copy.length;
		urlList = [];
		for(ix = 0; ix < len; ix++) {
			if(copy[ix] in map) {
				urlList.push(copy[ix]);
			}
		}
		current--;
		if(current == 4) {
			$("#top").css('height', '318px');
			$("#related").css('marginTop', '318px');
		}
		if(current == 3) {
			$("#top").css('height', '168px');
			$("#related").css('marginTop', '168px');
		}
		gen();
	} else {
		alert ("You tricky bastard. You are at first video.");
	}
}

function sort(mode, el) {
	sortOrder = mode;
	$(el).css('background','#008').siblings().css('background','transparent');
	gen();
}
function gen(){
	var ix, len, cur, o = [];
	if(sortOrder == ALPHA) {
		urlList.sort(function(a, b) {
			return map[a].toLowerCase() > map[b].toLowerCase();
		});
	}
	if(sortOrder == COUNT) {
		urlList.sort(function(a, b) {
			return count[a] < count[b];
		});
	}
	if(sortOrder == AGE) {
		urlList.sort(function(a, b) {
			return (lastseen[a][0] < lastseen[b][0]);
		});
	}
	len = urlList.length;

	for(ix = 0; ix < len; ix++) {
		cur = urlList[ix];
		o.push([
			"<tt>" + (current - lastseen[cur][0]) + "</tt>",
			"<tt>" + count[cur] + "</tt>",
			"<a onclick=loadit(this) q="+cur+">" + map[cur] + "</a>"
		].join(''));
	}
	$("#related").html(o.join('<br>'));
	setTimeout(function(){
		$("#related a").mouseover(function(){
			$("#preview").css('opacity', 0.3);
			$("#preview").attr('src', 'http://i4.ytimg.com/vi/' + this.getAttribute('q') + '/default.jpg');
		});
	}, 1000);
}
function dome(d){
	if(current == 3) {
		$("#top").css('height', '318px');
		$("#related").css('marginTop', '318px');
	}
	if(current == 2) {
		$("#top").css('height', '168px');
		$("#related").css('marginTop', '168px');
	}
	if(current >= mod) {
		var attr = $("#vid" + odder);
		attr.attr('src','http://www.youtube.com/v/'+d.vid+'&hl=en&fs=1&autoplay=1').remove().appendTo($("#vCon"));
		$("#vCon").css('margin', '0 1px');
		setTimeout(function(){
			$("#vCon").css('margin', '0');
		}, 1000);
	} else {
		$("#vid" + odder).attr('src','http://www.youtube.com/v/'+d.vid+'&hl=en&fs=1&autoplay=1').css('display','inline-block');
	}
	var 	len = d.rel.length,
		tmp = d.rel,
		ix;

	document.getElementById('vCon').firstChild.style.display='inline-block';
	current++;
	for(ix = 0; ix < len; ix ++) {
		var name = tmp[ix][0], url = tmp[ix][1];
		if(!count[url]) {
			map[url] = name;
			count[url] = 0;
			urlList.push(url);
			lastseen[url] = [];
		}
		lastseen[url].unshift(current);
		count[url]++;
	}
	gen();
}
$(document).ready(function(){
	var ix;
	for(ix = 0; ix < mod; ix++) {
		$('<embed id=vid' + ix + ' type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="188" height="152"></embed>').appendTo($("#vCon"));
	}
	loadit = function(el, attr){
		var url, ttl = "";
		if(attr) { 
			url = attr;
		} else if(el && ('getAttribute' in el)) {
			url = el.getAttribute('q');
			ttl = ' title="' + el.innerHTML.replace("'", "") + '"';
		} else {
			url = this.getAttribute('q');
			ttl = ' title="' + this.innerHTML.replace("'", "") + '"';
		}
		if(current >= mod) {
			$("<img" + ttl + " q="+url+" src=http://i4.ytimg.com/vi/"+url+"/default.jpg>").click(loadit).appendTo("#history");
			$("#history").append(" ");
		}
		$.getJSON('ytwatch1.php?a=1&v='+url,function(d){
			hist.push(d);
			dome(d);
			odder++;
			odder %= mod;
		});
	}

	$("#top").css('opacity', 0.75);
	$("#preview").attr('src', 'http://i4.ytimg.com/vi/' + rel.vid + '/default.jpg');
	$("#header tt").mousedown(function(e){
		e.preventDefault();
	});
	loadit(false, rel.vid);
});
</script>


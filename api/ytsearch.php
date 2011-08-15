<?
$r = new redis();
$r->connect('192.168.0.170', 6379);
$r->select(1);
$qstr = md5(strtolower($_GET['q']));
$artist = $_GET['a'];
$artist = str_replace('-',' ', $artist);
function artist_add(){
	if (isset($_GET['a'])) {
		$gramcount = 0;
		$list = explode(',', $_GET['a']);
		foreach($list as $artist) {
			$artist = str_replace('+', ' ', $artist);
			$lexemeList = explode(' ', strtolower($artist));
			foreach($lexemeList as $lexeme) {
				$ttllen = strlen($lexeme) + 1;
				for($len = 2; $len < 6; $len++) {	
					$end = min(1, $ttllen - $len);
					for($iy = 0; $iy < $end; $iy++) {
						$gram = substr($lexeme, $iy, $len);
						$r->sadd('g:'.$gram, $artist);
						$gramcount++;
					}
				}
			}
		}
	} 
}

if(sizeof($_POST) > 0) {
	$r->set("q:".$qstr, stripslashes($_POST['value']));
	print_r(stripslashes($_POST['value']));
	exit(0);
}
//$ret = $r->get("q:".$qstr);
echo $_GET['ix']."\n";
if(false) {
	echo $ret;
} else {
	usleep(rand(500000,2000000));
  
  $query = preg_replace('/%u\d{4}/','', utf8_decode($_GET['q']));
  $query = preg_replace('/%u\d{4}/','', urldecode($query));
  $query = preg_replace('/\(.*/','', urldecode($query));
  $results = file_get_contents('https://gdata.youtube.com/feeds/api/videos?alt=json&q='.urlencode($query).'&orderby=relevance&max-results=10&v=2');
  $results = json_decode($results, true);
  $videoList = $results['feed']['entry'];

	$out = Array();
  foreach($videoList as $video){
    $title = $video['title']['$t'];
    $ytid = $video['id']['$t'];
    $parts = explode(':', $ytid);
    $ytid = array_pop($parts);
    $out[] = $ytid."\t".substr($title, 0, 80);
  }

	if(count($out) > 0) {
		$out = html_entity_decode(join("\n", $out));
		$r->set('q:'.$qstr, $out);
		echo $out;
	}
}
?>

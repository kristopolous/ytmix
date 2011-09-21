<?
$query = preg_replace('/%u\d{4}/','', utf8_decode($_GET['query']));
$query = preg_replace('/%u\d{4}/','', urldecode($query));
$query = preg_replace('/\(.*/','', urldecode($query));
$results = json_decode(file_get_contents('https://gdata.youtube.com/feeds/api/videos?alt=json&q='.urlencode($query).'&orderby=relevance&max-results=20&v=2'), true);
$videoList = $results['feed']['entry'];

$resList = Array();

foreach($videoList as $video){
  $ytid = $video['id']['$t'];
  $parts = explode(':', $ytid);
  $ytid = array_pop($parts);

  $resList[] = Array(
    'title' => $video['title']['$t'],
    'ytid' => $ytid,
    'length' => intval($video['media$group']['yt$duration']['seconds'])
  );
}

echo json_encode(Array(
    'query' => $_GET['query'],
    'id' => intval($_GET['id']),
    'vidList' => $resList
  ));

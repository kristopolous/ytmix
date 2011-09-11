<?
$searchID = intval($_GET['id']);
$query = preg_replace('/%u\d{4}/','', utf8_decode($_GET['q']));
$query = preg_replace('/%u\d{4}/','', urldecode($query));
$query = preg_replace('/\(.*/','', urldecode($query));
$results = file_get_contents('https://gdata.youtube.com/feeds/api/videos?alt=json&q='.urlencode($query).'&orderby=relevance&max-results=20&v=2');
$results = json_decode($results, true);
$videoList = $results['feed']['entry'];

$out = Array(
  'query' => $_GET['q'],
  'id' => $searchID,
  'vidList' => Array()
);

foreach($videoList as $video){
  $ytid = $video['id']['$t'];
  $parts = explode(':', $ytid);
  $ytid = array_pop($parts);

  $out['vidList'][] = Array(
    'title' => $video['title']['$t'],
    'id' => $ytid,
    'length' => $video['media$group']['yt$duration']['seconds']
  );
}

echo json_encode($out);

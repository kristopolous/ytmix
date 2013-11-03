<?php
function pl_query($params) {
  $query = preg_replace('/%u\d{4}/','', utf8_decode($params['query']));
  $query = preg_replace('/%u\d{4}/','', urldecode($query));
  $query = preg_replace('/\(.*/','', urldecode($query));

  $url = 'https://gdata.youtube.com/feeds/api/videos?alt=json&q='.urlencode($query).'&orderby=relevance&max-results=20&v=2';
  $results = json_decode(file_get_contents($url), true);
  $resList = Array();

  if(!empty($results['feed']['entry'])) {
    $videoList = $results['feed']['entry'];

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
  }

  return Array(
    'query' => $_GET['query'],
    'vidList' => $resList,
    'url' => $url
  );
}

<?php
function pl_related($params) {
  $ytid = $params['id'];

  $related_videos = Array();
  $url = 'https://gdata.youtube.com/feeds/api/videos/' . $ytid .'/related?v=2';
  @$raw_data = file_get_contents($url);
  $xml = simplexml_load_string($raw_data);

  foreach($xml->entry as $row) {
    $pieces = explode(':', $row->id);
    $related_videos[] = Array(
      'ytid' => array_pop($pieces),
      'title' => strval($row->title)
    ); 
  }

  return Array(
    'ytid' => $ytid,
    'related' => $related_videos,
    'url' => $url
  );
}

function pl_query($params) {
  $qstr = $params['param'];
  $query = preg_replace('/%u\d{4}/','', utf8_decode($qstr));
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
    'query' => $qstr,
    'vidList' => $resList,
    'url' => $url
  );
}

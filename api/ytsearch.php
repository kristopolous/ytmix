<?php
function pl_related($params) {
  $ytid = $params['id'];
  $related_videos = [];
  
  if( !($auth_key = yt_authkey()) ) {
    return false;
  }

  $params = http_build_query([
    'key' => $auth_key,
    'part' => 'snippet',
    'maxResults' => 15,
    'relatedToVideoId' => $ytid,
    'videoEmbeddable' => 'true',
    'type' => 'video'
  ]);

  $url = "https://www.googleapis.com/youtube/v3/search?$params";

  $raw = file_get_contents($url);

  if ( !($res = @json_decode($raw, true)) ) {
    return false;
  }

  foreach($res['items'] as $item) {
    $related_videos[] = [
      'ytid' => $item['id']['videoId'],
      'title' => $item['snippet']['title']
    ]; 
  }

  return [
    'ytid' => $ytid,
    'related' => $related_videos,
    'url' => $url
  ];
}

function pl_query($params) {
  $qstr = $params['param'];

  $query = preg_replace('/%u\d{4}/','', utf8_decode($qstr));
  $query = preg_replace('/%u\d{4}/','', urldecode($query));
  $query = preg_replace('/\(.*/','', urldecode($query));

  if( !($auth_key = yt_authkey()) ) {
    return false;
  }

  $params = http_build_query([
    'key' => $auth_key,
    'part' => 'snippet',
    'maxResults' => 30,
    'q' => $query,
    'videoEmbeddable' => 'true',
    'type' => 'video'
  ]);

  $results = json_decode(file_get_contents($url), true);
  var_dump($results);
  exit(0);
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

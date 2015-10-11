<?php
function pl_related($params) {
  $ytid = $params['id'];
  $related_videos = [];
  
  if( !($res = yt_query([
    'part' => 'snippet',
    'maxResults' => 15,
    'relatedToVideoId' => $ytid,
    'videoEmbeddable' => 'true',
    'type' => 'video'
  ]) ) ) {
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
    'related' => $related_videos
  ];
}

function pl_query($params) {
  $qstr = $params['id'];

  $query = preg_replace('/%u\d{4}/','', utf8_decode($qstr));
  $query = preg_replace('/%u\d{4}/','', urldecode($query));
  $query = preg_replace('/\(.*/','', urldecode($query));

  if( !($res = yt_query([
    'part' => 'snippet',
    'maxResults' => 30,
    'q' => $query,
    'videoEmbeddable' => 'true',
    'type' => 'video'
  ]) ) ) {
    return false;
  }

  foreach($res['items'] as $video){

    $resList[] = [
      'title' => $video['snippet']['title'],
      'ytid' => $video['id']['videoId']
    ];
  }

  return [
    'query' => $qstr,
    'vidList' => $resList
  ];
}

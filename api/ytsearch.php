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
  $qstr = $params['param'] ?: $params['id'];
  $id = $params['id'];

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

    $ytid = $video['id']['videoId'];
    $resList[$ytid] = [
      'title' => $video['snippet']['title'],
      'ytid' => $ytid
    ];
  }

  if( !($res = yt_query([
    'ep' => 'videos',
    'part' => 'contentDetails',
    'id' => implode(',', array_keys($resList))
  ]) ) ) {
    return false;
  }

  foreach($res['items'] as $video) {
    $minute = 0;
    $second = 0;
    $hour = 0;

    $ytid = $video['id'];
    $duration = $video['contentDetails']['duration'];

    do {
      $res = preg_match('/PT(\d*)M(\d*)S/', $duration, $matches);
      if($res) {
        $minute = intval($res[1]);
        $second = intval($res[2]);
        break;
      } 

      $res = preg_match('/PT(\d*)M$/', $duration, $matches);
      if($res) {
        $minute = intval($res[1]);
        break;
      }

      $res = preg_match('/PT(\d*)H(\d*)M(\d*)S/', $duration, $matches);
      if($res) {
        $hour = intval($res[1]);
        $minute = intval($res[2]);
        $second = intval($res[3]);
      }
    } while(0);

    var_dump([$duration, $matches]);
  }

  yt_duration(array_keys($resList));

  return [
    'query' => $qstr,
    'vidList' => $resList,
    'id' => $id
  ];
}

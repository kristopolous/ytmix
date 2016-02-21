<?php
function pl_related($params) {
  if(!isset($params['id'])) {
    return doError("Id isn't set.");
  }
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

function intget($what) {
  $ret = [];
  for($ix = 1; $ix < count($what); $ix++) {
    $ret[] = intval($what[$ix]);
  }
  return $ret;
}

function yt_by_id($id_list) {
  // if we have a string make it an array
  if(is_string($id_list)) {
    $id_list = [$id_list];
  }

  // if it's a hash, make it an array
  if(!array_key_exists('0', $id_list)) {
    $id_list = array_keys($id_list);
  }

  if( !($res = yt_query([
    'ep' => 'videos',
    'part' => 'contentDetails',
    'id' => implode(',', $id_list)
  ]) ) ) {
    return false;
  }

}

function yt_search($qstr) {
  // If we are being sent a ytid then we just use a different path.
  if(strpos($qstr, "http") === 0) {
    if( !($res = yt_query([
      'ep' => 'videos',
      'part' => 'contentDetails',
      'id' => implode(',', array_keys($resList))
    ]) ) ) {
      return false;
    }
  }

  //$query = preg_replace('/%u\d{4}/','', utf8_decode($qstr));
  //$query = preg_replace('/%u\d{4}/','', urldecode($query));
  //$query = preg_replace('/\(.*/','', urldecode($query));
  //var_dump($query);exit(0);
  $query = $qstr;

  if( !($res = yt_query([
    'part' => 'snippet',
    'maxResults' => 30,
    'q' => $query,
    'videoEmbeddable' => 'true',
    'type' => 'video'
  ]) ) ) {
    return false;
  }
  return $res;
}

function pl_query($params) {
  $qstr = $params['param'] ?: $params['id'];
  $id = $params['id'];
  $resList = [];

  $res = yt_search($qstr);
  if(!$res) {
    return false;
  }
  if(count($res['items']) == 0) {
    $parts = explode(' ', $qstr);
    array_pop($parts);
    $qstr = implode(' ', $parts);
    $res = yt_search($qstr);
    if(!$res) {
      return false;
    }
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

    if($res = preg_match('/PT(\d*)M(\d*)S/', $duration, $matches)) {
      list( $minute, $second ) = intget($matches);
    } else if($res = preg_match('/PT(\d*)M$/', $duration, $matches)) {
      list( $minute ) = intget($matches);
    } else if($res = preg_match('/PT(\d*)H(\d*)M(\d*)S/', $duration, $matches)) {
      list( $hour, $minute, $second ) = intget($matches);
    }

    $resList[$ytid]['length'] = ($hour * 60 + $minute) * 60 + $second;
  }

  return [
    'query' => $qstr,
    'vidList' => array_values($resList),
    'id' => $id
  ];
}

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

  $ytidList = [];
  foreach($res['items'] as $item) {
    $ytidList[] = $item['id']['videoId'];
  }
  $details = pl_ytinfo(['id' => implode(',', $ytidList)]);

  foreach($details as $item) {
    if($item['statistics']['viewCount'] < 300000) {
      $related_videos[] = [
        'ytid' => $item['id'],
        'title' => $item['snippet']['title'],
        'uploader' => $item['snippet']['channelTitle'],
        'cid' => $item['snippet']['channelId']
      ]; 
    }
  }

  return [
    'ytid' => $ytid,
    'related' => $related_videos
  ];
}

function pl_ytinfo($params) {
  if(!isset($params['id'])) {
    return doError("Id isn't set.");
  }
  $sections = isset($params['param']) ? $params['param'] : 'snippet,statistics';

  $ytid = $params['id'];
  $params = [
    'part' => $sections,
    'maxResults' => 30,
    'ep' => 'videos',
    'id' => $ytid
  ];
  
  if( !($res = yt_query($params)) ) {
    return false;
  }

  return $res['items'];
}

function intget($what) {
  $ret = [];
  for($ix = 1; $ix < count($what); $ix++) {
    $ret[] = intval($what[$ix]);
  }
  return $ret;
}

function yt_parse_duration($video) {
  $minute = 0;
  $second = 0;
  $hour = 0;

  $duration = $video['contentDetails']['duration'];

  if($res = preg_match('/PT(\d*)M(\d*)S/', $duration, $matches)) {
    list( $minute, $second ) = intget($matches);
  } else if($res = preg_match('/PT(\d*)M$/', $duration, $matches)) {
    list( $minute ) = intget($matches);
  } else if($res = preg_match('/PT(\d*)H(\d*)M(\d*)S/', $duration, $matches)) {
    list( $hour, $minute, $second ) = intget($matches);
  }
  return  ($hour * 60 + $minute) * 60 + $second;
}


function yt_by_id($id_list) {
  // if we have a string make it an array
  if(is_string($id_list)) {
    if(strpos($id_list, "http") === 0) {
      $parts = parse_url($id_list);
      parse_str($parts['query'], $opts);
      $id_list = [$opts['v']];
    } else {
      $id_list = [$id_list];
    }
  }

  // if it's a hash, make it an array
  if(!array_key_exists('0', $id_list)) {
    $id_list = array_keys($id_list);
  }
  $id_str = implode(',', $id_list);

  // we need to get both the duration and the 
  // name
  /*
  if( !($duration = yt_query([
    'ep' => 'videos',
    'part' => 'contentDetails',
    'id' => $id_str
  ]) ) ) {
    return $duration;
  }
   */

  if( !($title = yt_query([
    'ep' => 'videos',
    'part' => 'snippet',
    'id' => $id_str
  ]) ) ) {
    return $title;
  }

  return $title;
  //var_dump([$duration, $title]);

}

function yt_search($query) {
  // If we are being sent a ytid then we just use a different path.
  if(strpos($query, "http") === 0) {
    return yt_by_id($query);
  }

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
  if(strpos($qstr, 'youtube.com') !== false) {
    $comp = parse_url($qstr);
    parse_str($comp['query'], $query);
    $res = ['items' => pl_ytinfo(['id' => $query['v']])];
  } else {
    if( !($res = yt_search($qstr)) ) {
      return false;
    }
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
    $ytid = is_string($video['id']) ? $video['id'] : $video['id']['videoId'];
    $resList[$ytid] = [
      'title' => $video['snippet']['title'],
      'ytid' => $ytid,
      'uploader' => $video['snippet']['channelTitle'],
      'cid' => $video['snippet']['channelId']
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
    $ytid = $video['id'];
    $resList[$ytid]['length'] = yt_parse_duration($video);
  }

  return [
    'query' => $qstr,
    'vidList' => array_values($resList),
    'id' => $id
  ];
}

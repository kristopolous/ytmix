<?php
function pl_related($params) {
  $ytid = $params['id'];

  $related_videos = Array();
  $url = 'https://gdata.youtube.com/feeds/api/videos/' . $ytid .'/related?v=2';

  // simple_xml breaks down with namespaces ... you need to register xmlns documents
  // and then do xpath queries and find parent nodes and lots of utter nonsense because
  // colons aren't supported.  Soooo lets just removed the fucking colons.
  $raw_data = preg_replace('/yt:statistics/', 'stats', file_get_contents($url));
  $xml = simplexml_load_string($raw_data);

  foreach($xml->entry as $row) {
    $pieces = explode(':', $row->id);

    // youtube related videos have turned to crap recently,
    // trying to suggest things with a bazillion views that
    // have zero relation whatsoever - so we only include things
    // that have fewer views - 100k seems to be a good number
    // to avoid stupid shit.
    $vc = (int)$row->stats['viewCount'][0];
    if ($vc < 20000) {
      $related_videos[] = Array(
        'vc' => $vc,
        'ytid' => array_pop($pieces),
        'title' => strval($row->title)
      ); 
    }
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

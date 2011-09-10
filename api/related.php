<?
$related_videos = Array();
$ytID = $_GET['v'];
$main_doc = new DOMDocument();
$main_doc->preserveWhiteSpace = FALSE;
@$raw_data = file_get_contents("http://www.youtube.com/watch?v=$ytID");
@$main_doc->loadHTML($raw_data);
$nodelist = $main_doc->getElementsByTagName("title");

foreach ($nodelist as $node) {
	$title = $node->nodeValue;
	$title = explode('-', $title);
	array_pop($title);
	$title = implode('-', $title);
	break;
}

$length = preg_match('/ "length_seconds": (\d+)/', $raw_data, $matches);
$nodelist = $main_doc->getElementsByTagName("a");
foreach ($nodelist as $node) {

	if($node->hasAttribute("class") && (trim($node->getAttribute('class')) == 'video-list-item-link')) {
		$link = $node->getAttribute('href');

		if(strpos($link, 'watch?')) {
			
			$related_videos[] = Array(
				$node->childNodes->item(1)->getAttribute('title'),
				preg_replace('/^.*v=([^&]*).*/', '$1', $link)
			);

    } else {
      echo 'link failed';
    }
	}
}

echo json_encode(Array(
  'length' => intval($matches[1]),
	'video' => $ytID,
	'title' => trim(preg_replace('/\s+/', ' ', $title)),
	'related' => $related_videos
));

?>

<?
include ('../lib/common.php');

$ret = run_assoc("select * from playlist where tracklist is not NULL");

// It's almost as if PHP was intended to be a templating language ... lol
?>

<style> th, td { background: #eee; padding: 0 2em 0 0.5em} table{ background: #687 } </style>

<table>

  <caption><?= count($ret) ?> Active</caption>

  <thead>
    <tr>

    <?
    foreach(Array(
      'id',
      'name',
      'tracklist bytes',
      'count',
      'density',
      'blacklist bytes',
      'count') as $row) { ?>

      <th><?= $row ?></th>

    <? } ?>
    </tr>
  </thead>

  <tbody>

  <?
  foreach($ret as $row) {

    $track = json_decode($row['tracklist']);
    $black = json_decode($row['blacklist']);

    if(count($track) == 0) {
      continue;
    }
    ?>

    <tr>

    <?
    foreach(Array(
      $row['id'],
      $row['name'],
      strlen($row['tracklist']),
      count($track),
      floor(strlen($row['tracklist']) / count($track)),
      strlen($row['blacklist']),
      count($black)) as $el) { ?> 

      <td><?= $el ?></td>

    <? } ?>
    </tr>

  <? } ?>
  </tbody>

</table>

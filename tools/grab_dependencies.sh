#!/usr/bin/env bash

[ -e tools ] && cd tools

while [ $# -gt 0 ]; do
  name=$1
  [ -e ../js/min/$name ] || name=$name.js
  if [ -e ../js/min/$name ]; then
    echo "Removing $name"
    rm ../js/min/$name ../js/raw/$name
  else
    echo "Can't find $name or $1"
  fi
  shift
done

wget="wget --quiet --no-check-certificate"

version_jq=2.2.2

rawURLList="\
 damerau-levenshtein.js https://raw.github.com/cbaatz/damerau-levenshtein/master/damerau-levenshtein.js\
 db.js https://github.com/kristopolous/db.js/raw/master/release/db.js\
 jquery.js http://code.jquery.com/jquery-${version_jq}.js\
 underscore.js https://raw.github.com/documentcloud/underscore/master/underscore.js\
 evda.js https://raw.github.com/kristopolous/EvDa/master/release/evda.js"

minURLList="\
 damerau-levenshtein.js https://raw.github.com/cbaatz/damerau-levenshtein/master/damerau-levenshtein.js\
 db.js https://github.com/kristopolous/db.js/raw/master/release/db.min.js\
 jquery.js http://code.jquery.com/jquery-${version_jq}.min.js\
 underscore.js https://raw.github.com/documentcloud/underscore/master/underscore-min.js\
 evda.js https://raw.github.com/kristopolous/EvDa/master/release/evda.min.js"

ARGS=$#
DIR=""

download() {
  fileList=""
  [ -d $DIR ] || mkdir $DIR

  if [ $ARGS -gt 0 ]; then
    echo "Cleaning $DIR"
    rm $DIR/*.js
  fi

  while [ $# -gt 0 ]; do
    file=$1

    if [ ! -s $DIR/$file ]; then 
      echo "Getting $2 > $DIR/$file"
      $wget $2 -O $DIR/$file
    fi
    echo "<script src=\"js/$DIR/$file\"></script>" >> .tmpfile

    shift; shift;
  done

  cat .tmpfile
  rm .tmpfile
}
  
(
  cd ../js
  DIR=raw
  download $rawURLList
)

(
  cd ../js
  DIR=min
  download $minURLList
)


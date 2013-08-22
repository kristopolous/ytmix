#!/usr/bin/env bash

while [ $# -gt 0 ]; do
  if [ -e ../js/min/$1 ]; then
    echo "Removing $1"
    rm ../js/min/$1 ../js/raw/$1
  fi
  shift
done

wget="wget --quiet --no-check-certificate"

version_jq=1.9.0

rawURLList="\
 damerau-levenshtein.js https://raw.github.com/cbaatz/damerau-levenshtein/master/damerau-levenshtein.js\
 swfobject.js http://swfobject.googlecode.com/svn/trunk/swfobject/src/swfobject.js\
 db.js https://github.com/kristopolous/db.js/raw/master/db.js\
 _inject.js https://github.com/kristopolous/_inject/raw/master/_inject.js\
 jquery-${version_jq}.js http://code.jquery.com/jquery-${version_jq}.js\
 underscore.js https://raw.github.com/documentcloud/underscore/master/underscore.js\
 evda.js https://raw.github.com/kristopolous/EvDa/master/evda.js"

minURLList="\
 damerau-levenshtein.js https://raw.github.com/cbaatz/damerau-levenshtein/master/damerau-levenshtein.js\
 swfobject.js http://swfobject.googlecode.com/svn/trunk/swfobject/swfobject.js\
 db.js https://github.com/kristopolous/db.js/raw/master/db.min.js\
 _inject.js https://github.com/kristopolous/_inject/raw/master/_inject.min.js\
 jquery-${version_jq}.js http://code.jquery.com/jquery-${version_jq}.min.js\
 underscore.js https://raw.github.com/documentcloud/underscore/master/underscore-min.js\
 evda.js https://raw.github.com/kristopolous/EvDa/master/evda.min.js"

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

    if [ ! -e $DIR/$file ]; then 
      echo "Getting $2 > $DIR/$file"
      $wget $2 -O $DIR/$file
    fi
    echo "<script src=js/$DIR/$file></script>" >> .tmpfile

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


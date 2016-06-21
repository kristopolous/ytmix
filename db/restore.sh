#!/bin/sh
. ../secrets/db.ini
if [ -z "$password" ]; then
  echo 'create database yt' | mysql -h $host -u $user
  lzcat mysql-dump.db.lzma | mysql -h $host -u $user yt 
else
  echo 'create database yt' | mysql -h $host -u $user -p$password
  lzcat mysql-dump.db.lzma | mysql -h $host -u $user -p$password yt 
fi

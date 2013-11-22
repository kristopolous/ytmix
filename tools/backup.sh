#!/bin/bash

mysqldump -uroot yt | lzma -zc - > ../db/mysql-dump.db.lzma

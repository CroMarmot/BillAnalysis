iconv -f gbk -t utf8 -o "$1.new" "$1" && mv -f "$1.new" "$1"

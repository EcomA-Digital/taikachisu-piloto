#!/bin/bash
set -euo pipefail
# Only this pilot directory is published; WordPress remains in public_html.
repo=/home/taikxxot/repositories/taikachisu-piloto
target=/home/taikxxot/public_html/preview
previous=/home/taikxxot/public_html/piloto
git_bin=/usr/local/cpanel/3rdparty/bin/git
cd "$repo"
[[ "$PWD" == "$repo" && -d .git && -f index.html && -d assets ]]
[[ -f static-pages.txt && -f .htaccess && -f seo-pages.json ]]
grep -Fq 'noindex' .htaccess
grep -Fq '"base":"/preview/"' seo-pages.js
[[ ! -L "$target" ]]
[[ ! -e "$target" || -f "$target/deployment.json" ]]
[[ ! -L "$previous" && -f "$previous/deployment.json" ]]
[[ "$(cd "$previous" && pwd -P)" == "$previous" ]]
revision=$("$git_bin" rev-parse HEAD)
if [[ -f "$target/deployment.json" ]] && grep -Fq "$revision" "$target/deployment.json"; then
  exit 0
fi
mkdir -p "$target/assets"
[[ "$(cd "$target" && pwd -P)" == "$target" ]]
cp -R assets/. "$target/assets/"
for file in *.css *.js *.json *.html sitemap.xml robots.txt; do
  [[ -f "$file" ]] || continue
  [[ "$file" != index.html ]] || continue
  cp "$file" "$target/$file"
done
while IFS= read -r page; do
  [[ "$page" == index.html ]] && continue
  [[ "$page" =~ ^([a-z0-9-]+/)+index\.html$ && -f "$page" ]]
  relative="${page%/*}"
  parent="$target"
  IFS=/ read -r -a segments <<< "$relative"
  for segment in "${segments[@]}"; do
    parent="$parent/$segment"
    [[ ! -L "$parent" ]]
    mkdir -p "$parent"
    [[ "$(cd "$parent" && pwd -P)" == "$parent" ]]
  done
  cp "$page" "$target/$page.next"
  mv "$target/$page.next" "$target/$page"
done < static-pages.txt
cp .htaccess "$target/.htaccess"
cp index.html "$target/index.html.next"
mv "$target/index.html.next" "$target/index.html"
printf '{"revision":"%s","deployedAt":"%s"}\n' "$revision" "$(date -u +%FT%TZ)" > "$target/deployment.json.next"
mv "$target/deployment.json.next" "$target/deployment.json"
printf 'Options -Indexes\nRedirectMatch 302 ^/piloto/(.*)$ /preview/$1\n' > "$previous/.htaccess"
printf '%s deployed %s to preview\n' "$(date -u +%FT%TZ)" "$revision"

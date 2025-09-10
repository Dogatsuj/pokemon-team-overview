#!/bin/bash

ng build --output-path=docs --base-href=/pokemon-team-overview/

if [ -d "docs/browser" ]; then
  echo "Moving contents from docs/browser/ to docs/"
  mv docs/browser/* docs/
  rmdir docs/browser
else
  echo "The folder docs/browser does not exist, nothing to move."
fi

cp docs/index.html docs/404.html

echo "Local deployment finished"

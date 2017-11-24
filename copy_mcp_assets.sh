#!/bin/sh

cp /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/dist/*.js ./.tmp/scripts/
cp /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/dist/*.css ./.tmp/styles/
cp -R /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/public/views ./.tmp/
cp -R /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/public/templates ./.tmp/


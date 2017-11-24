#!/bin/sh

mkdir -p ./.tmp/scripts/extensions/
mkdir -p ./.tmp/styles/extensions/
mkdir -p ./.tmp/styles/extensions/mcp/styles/
cp /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/dist/*.js ./.tmp/scripts/extensions/
cp /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/dist/*.css ./.tmp/styles/extensions/
cp -R /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/public/styles/feedhenry-font ./.tmp/styles/extensions/mcp/styles/

mkdir -p ./.tmp/extensions/mcp
cp -R /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/public/views ./.tmp/extensions/mcp
cp -R /home/dmartin/go/src/github.com/feedhenry/mcp-standalone/ui/public/templates ./.tmp/extensions/mcp

#!/bin/bash
DIRECTORY_TO_OBSERVE="tmpl"
BUILD_SCRIPT="build_tmpl.sh"

function block_for_change {
    inotifywait -e modify,move,create,delete $DIRECTORY_TO_OBSERVE
}

function build {
    bash $BUILD_SCRIPT
}

build
while block_for_change; do
  build
done

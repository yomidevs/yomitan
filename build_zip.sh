#!/bin/sh
ZIP=yomichan.zip
rm -f $ZIP
7z a $ZIP ./ext/*

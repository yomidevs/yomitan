#!/bin/sh
ZIP=yomichan.zip
rm -f $ZIP
7z a yomichan.zip ./ext/*

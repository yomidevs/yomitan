#!/bin/sh
ZIP=yomichan.zip
rm -f $ZIP
7za a $ZIP ./ext/*

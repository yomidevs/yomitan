#!/bin/bash

rm yomichan_source.zip
7za a yomichan_source.zip ./ext ./LICENSE ./README.md ./resources ./tmpl

rm yomichan_extension.zip
7za a yomichan_extension.zip ./ext/*

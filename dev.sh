#!/bin/bash
# Launch Chrome with file:// access enabled for local development
# Quit Chrome fully before running this script

open -a "Google Chrome" --args --allow-file-access-from-files "$PWD/markdown-presenter.html"

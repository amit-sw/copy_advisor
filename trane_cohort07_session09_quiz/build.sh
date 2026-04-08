#!/bin/bash
# Assembles the quiz from parts.
# Run from the quiz directory: bash build.sh
set -euo pipefail
cat _base.html sections/*.html _footer.html > index.html
echo "Built index.html — open it in your browser."

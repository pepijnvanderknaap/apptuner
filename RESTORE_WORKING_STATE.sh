#!/bin/bash
# Restore to working state (acd63f0)
# Run this script to revert to the last known working configuration

echo "🔄 Restoring to working state..."
echo ""
echo "Git commit: acd63f0"
echo "Description: Auto-reload fully functional with test-bundle.js"
echo ""

read -p "Are you sure you want to restore? This will discard current changes. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git reset --hard acd63f0
    echo "✅ Restored to working state (acd63f0)"
    echo ""
    echo "Next steps:"
    echo "1. Refresh browser at localhost:1420"
    echo "2. Rebuild mobile app (if needed)"
    echo "3. Test: Send Test Bundle → START → Edit public/test-bundle.js"
else
    echo "❌ Restore cancelled"
fi

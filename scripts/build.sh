#!/bin/bash

# Build script for Berkeley Paths Tracker
# This script creates a production-ready version

echo "🚀 Building Berkeley Paths Tracker..."

# Create build directory
mkdir -p build

# Copy files to build directory
echo "📦 Copying files..."
cp index.html build/
cp -r data build/
cp -r src build/
cp -r assets build/

# Validate JSON
echo "✅ Validating paths data..."
if node -e "require('./data/paths-data.json')" 2>/dev/null; then
    echo "✅ JSON is valid!"
else
    echo "❌ JSON validation failed!"
    exit 1
fi

# Optional: Minify (uncomment if you want to add minification)
# echo "🗜️  Minifying files..."
# (requires uglify-js, clean-css, html-minifier)

echo "✨ Build complete! Files are in ./build directory"
echo "📂 Deploy the contents of ./build to your web server"

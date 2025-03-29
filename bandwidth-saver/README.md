# Bandwidth Saver Chrome Extension

A simple Chrome extension that blocks images and videos to save bandwidth.

## Features

- Blocks all images on web pages
- Blocks video content including common video formats
- Removes video and iframe elements from the DOM
- Continuously monitors for dynamically added media elements

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension will be active immediately

## Files

- `manifest.json`: Extension configuration
- `rules.json`: Declarative network request rules for blocking media
- `content.js`: Script to remove video elements from the DOM

## How It Works

This extension uses Chrome's Declarative Net Request API to block image and media resources before they are loaded. Additionally, it uses a content script to remove any video or iframe elements that might still appear on the page.

## License

MIT
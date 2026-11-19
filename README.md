# BetterYT — YouTube UI Rework

A lightweight Manifest V3 browser extension (Chrome, Edge, Brave, Firefox) that reworks the YouTube watch experience to fix common UI frustrations without breaking native functionality.

## Features

1. **Independently Scrollable Related Videos**
   - Turns the right-hand related videos sidebar (`#secondary`) into a sticky, independently scrollable panel (`overscroll-behavior: contain`) so you can browse related videos while keeping the video player on screen.
   - Automatically nudges YouTube's infinite-scroll loader as you approach the bottom of the sidebar.

2. **Enhanced Theater Mode**
   - Expands YouTube's Theater Mode player to genuinely fill the screen with three selectable modes:
     - **Fill Viewport** (default): Full width & full height below the top header.
     - **85% Height**: Large cinematic player while keeping the video title visible.
     - **Full Bleed**: 100% viewport width & height; auto-hides the top header until you hover the top edge.
   - Forces the `<video>` element and `.ytp-chrome-bottom` scrubber bar to scale cleanly and triggers a player resize on mode changes.

3. **Unobstructed Player Controls (Interrupt Banner Protection)**
   - Relocates bottom-left toast/snackbar popups (`tp-yt-paper-toast`) to the top-right so they never cover Play/Pause, Next, or Volume buttons.
   - Suppresses intrusive bottom-left promo mealbars (`yt-mealbar-promo-renderer`).
   - Moves in-player bottom-left overlays (Paid Promotion, Suggested Action badges, Product tags) to the top-left and elevates `.ytp-chrome-bottom` `z-index`.
   - Optionally hides the "More Videos" pause overlay.

4. **Video Thumbnail Preview & Quick Open (Extension Popup)**
   - Automatically detects the active YouTube video (`/watch`, `/shorts`, `/live`, `youtu.be`) when you open the extension popup.
   - Displays a 16:9 preview of the highest available resolution (`maxresdefault` → `sddefault` → `hqdefault`) with a resolution badge and an **Open Thumbnail in New Tab** button.

## Installation

### Chrome / Edge / Brave
1. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `betteryt` folder.
4. Open any YouTube video — click the **BetterYT** toolbar icon to toggle features, switch Theater Mode sizing live, or preview/open the video thumbnail.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` inside this `betteryt` folder.

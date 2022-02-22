# NetBeans tools for Visual Studio Code

NetBeans formatter tools integration

## Installation

Open command palette <kbd>F1</kbd> and select `Extensions: Install Extension`, then search for nbtools.

**Note**: Java is required to run formatting tools. Download java on: [https://www.java.com](https://www.java.com)

## Usage

<kbd>F1</kbd> -> `nbtools: Format This File`

or keyboard shortcut `Ctrl + Shift + I` which is Visual Studio Code default formatter shortcut

or right mouse context menu `Format Document` or `Format Selection`

## Setup NetBeans config zipfile

You can import formatter settings from file exported from NetBeans:
1. Export NetBeans IDE config to zip file.
2. In VSCode open extension settings and search `Nb_config_zipfile` option.
3. Set absolute path to your zip config file in `Nbtools: Nb_config_zipfile` input.

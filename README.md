# Transparent Zen

Transparent Zen is a browser extension specifically designed for Zen Browser. This extension injects styles into supported websites to make them transparent, providing a new experience.

<a href="https://addons.mozilla.org/en-US/firefox/addon/transparent-zen/">
    <img alt="Firefox Add-Ons" src="https://blog.mozilla.org/addons/files/2015/11/get-the-addon.png" height="40">
</a>

## Table of Contents

- [Transparent Zen](#transparent-zen)
- [Supported Websites](#supported-websites)
- [Prerequisites](#prerequisites)
    - [Windows 11](#windows-11)
- [Installation](#installation)
    - [Dark Reader](#dark-reader)
- [Usage](#usage)
    - [Customization](#customization)
- [Contributing](#contributing)
- [License](#license)

## Supported Websites
🔴 = Not working / Broken
<br>
🟠 = Work in Progress
<br>
🟢 = Working

The following websites are currently supported by Transparent Zen:

- 🟢 ddl-warez.cc
- 🟢 mail.proton.me
- 🟢 reddit.com
- 🟢 store.steamworks.com
- 🟢 steamcommunity.com
- 🟢 wuwatracker.com
- 🟢 youtube.com
- 🟢 wikipedia.org
- 🟢 chatgpt.com
- 🟢 copilot.microsoft.com
- 🟢 chess.com
- 🟢 github.com
- 🟢 bing.com
- 🟢 kryptex.com
- 🟢 leetcode.com
- 🟢 programiz.com (only for their dark theme)
- 🟢 nexusmods.com
- 🟢 duckduckgo.com
- 🟢 epicgames.com
- 🟢 google.com
- 🟢 notebooklm.google.com
- 🟢 outlook.live.com
- 🟠 amazon.de
- 🟠 lieferando.at
- 🔴 gog.com
- 🔴 kinguin.net

#### To Do
- [x] ~~outlook.live.com~~
- [x] ~~notebooklm.google.com~~
- [ ] web.whatsapp.com
- [ ] Plex Media Server (usually 127.0.0.1:32400)
- [ ] linkedin.com
- [x] ~~google.com~~
- [ ] instagram.com
- [ ] x.com
- [ ] threads.net
- [ ] monkeytype.com
- [ ] quora.com
- [ ] search.brave.com

## Prerequisites
#### Windows 11
1. Install [MicaForEveryone](https://github.com/MicaForEveryone/MicaForEveryone)
2. In MicaForEveryone add a new process rule and select "zen"
3. Activate **Blur Behind** and set the Backdrop Type to **Acrylic**
4. Open Zen Browser and go to `about:config`
5. Make sure that `browser.tabs.allow_transparent_browser`, `widget.transparent-windows` and `widget.windows.mica` are all set to **true**

##### TODO: Add other OS prerequisites

## Installation

To install Transparent Zen, you can either download it from the [Firefox Add-Ons Store](https://addons.mozilla.org/en-US/firefox/addon/transparent-zen) or grab the latest release from github and manually install it through the Zen Browser settings.

#### Dark Reader
If you are using Dark Reader, ensure that it is disabled for the websites you want to view as transparent.

## Usage

Once installed, Transparent Zen will automatically apply transparent styles to the supported websites listed above. No further configuration is required.

#### Customization
I highly recommend darkening the browser theme slightly by right-clicking the Zen Browser Toolbar and selecting **Change Theme Colors**. I'm personally using the hex code **#00000066** which darkens the browser background slightly while maintaining readability. But of course, feel free to play around to find the best color to your liking!

##### ⚠️ Since Zen Browser 1.8.1b you need to set `zen.theme.gradient.show-custom-colors` to **true** in `about:config` in order to be able to set a hex code for the theme color

## Contributing

The main idea behind this project is for the community to contribute and add styles for their favorite websites, so that everyone can enjoy a fully transparent experience.
<br>
If you would like to contribute to Transparent Zen, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with a descriptive message.
4. Push your changes to your fork and create a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

Enjoy your transparent browsing experience with Transparent Zen!

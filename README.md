# Blumaple App

## Open on a phone with Expo Go

Use Node.js 20, install the dependencies, and start Expo in tunnel mode:

```sh
nvm use
npm install
npm run start:tunnel
```

Then open the current Expo Go app on the phone and scan the QR code. Tunnel mode
is required when this project runs in Codespaces or when the phone cannot reach
the computer over the same local network.

If Expo Go reports that the project uses an unsupported SDK, update Expo Go from
the App Store or Play Store. This project uses Expo SDK 54.

To reset stale Metro data, run:

```sh
npx expo start --tunnel --clear
```

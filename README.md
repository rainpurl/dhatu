# Dhatu - Gujarati learning app

A single-page React app. Sounds and script, vocabulary, grammar, guided conversations with speaking practice, spaced-repetition review, and a sourced history section.

## Running it on your own computer

You need [Node.js](https://nodejs.org) installed first (the LTS version is fine). Then, in this folder:

```
npm install
npm run dev
```

This starts a local server (usually at `http://localhost:5173`) where you can view the app in your browser and see changes live.

## Building it for deployment

```
npm run build
```

This creates a `dist` folder containing the finished website: an `index.html` file and a small set of asset files. That `dist` folder is what you deploy, not the source code directly.

You can also run `npm run preview` after building to check the built version locally before deploying it.

## What is in this project

- `index.html` - the page shell.
- `src/main.jsx` - mounts the app into the page.
- `src/App.jsx` - the entire app: content, screens, and logic.
- `package.json` - the two dependencies (React) and the three scripts above.
- `vite.config.js` - build tool configuration.

## About saved progress

This version of the app saves progress (Kaudi points, streak, completed lessons, review words, and settings) to the browser's local storage, so it persists across page refreshes on the same device and browser. It does not sync across devices, since that would require a backend and a database, which this project does not have.

If you ever see this same app running inside a Claude conversation as an interactive preview, that version will not save progress. Claude's preview sandbox does not allow that kind of browser storage. This standalone version does not have that restriction.

## Deployment

See the accompanying chat conversation for step-by-step deployment guidance for Cloudflare Pages.

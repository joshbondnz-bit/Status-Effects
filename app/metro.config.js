// Lets the app import the shared engine from ../engine (outside the app folder).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.join(repoRoot, 'engine')];

module.exports = config;

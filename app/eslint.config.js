// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // This rule guards against stray quotes in HTML. In React Native, apostrophes inside <Text>
      // ("you're", "tonight's") are plain text and render correctly, so it only adds noise here.
      'react/no-unescaped-entities': 'off',
    },
  },
]);

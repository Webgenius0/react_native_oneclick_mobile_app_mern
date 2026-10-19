/*
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
*/


const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

const escapePath = filePath => filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockRoot = folder =>
  new RegExp(`${escapePath(path.join(__dirname, folder))}[/\\\\].*`);

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    blockList: exclusionList([
      blockRoot('android'),
      blockRoot('react_native_oneclick_old'),
      blockRoot('backups'),
      blockRoot('dokuman'),
      blockRoot('ios'),
      blockRoot('trendyol'),
      blockRoot('vendor'),
      /.*[/\\]\.cxx[/\\].*/,
      /.*[/\\]CMakeFiles[/\\].*/,
      /.*[/\\]\.gradle[/\\].*/,
      /.*[/\\]@react-native[/\\]gradle-plugin[/\\].*[/\\]build[/\\].*/,
    ]),
  },
};

module.exports = mergeConfig(defaultConfig, config);

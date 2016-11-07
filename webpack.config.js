const webpack = require("webpack");
const config  = {};

config.entry = 
{
  'main': './src/main.js'
};

config.output =
{
  path: './dist',
  filename: '[name].js'
};

config.module =
{
  loaders: 
  [
    {
      test: /\.json$/,
      loader: 'json-loader'
    }
  ]
};

module.exports = config;
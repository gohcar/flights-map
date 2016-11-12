const webpack     = require("webpack");
const EVENT       = process.env.npm_lifecycle_event;
const PROD        = EVENT.includes('prod');
const config      = {};
const libraryName = 'FlightsMap';
const filename    = 'flights-map';

config.entry = './src/'+filename+'.js'

config.output =
{
  library: libraryName,
  path: './dist',
  filename: PROD? filename+'.min.js': filename+'.js'
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

config.plugins = [];

if (PROD) 
{
  config.plugins.push(
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.UglifyJsPlugin(
    {
      beautify: false,
      comments: false
    })
  );
}

console.log(PROD? 'PRODUCTION BUILD': 'DEVELOPMENT BUILD');

module.exports = config;
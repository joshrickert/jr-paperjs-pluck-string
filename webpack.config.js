'use strict';

const path = require('path');

module.exports = {
  entry: './demo/demo.js',
  output: {
    path: path.resolve(__dirname, 'demo/dist'),
    filename: 'demo.bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(mp3|ogg|wav)$/,
        loader: 'file-loader',
        options: {
          publicPath: 'dist/'
        },
      }
    ]
  }
};
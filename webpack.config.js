const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Load environment variables
require('dotenv').config();
const { processManifest, validateIconPaths } = require('./scripts/process-manifest');
const { iconConfig } = require('./config/icons.config');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  // Validate icon paths before build
  const publicDir = path.resolve(__dirname, 'public');
  const warnings = validateIconPaths(publicDir);

  if (warnings.length > 0 && isProduction) {
    console.error('\n❌ Missing icons in production build. Please generate all required icons.\n');
    process.exit(1);
  }

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',
    entry: {
      'background/service-worker': './src/background/service-worker.ts',
      'content/content': './src/content/content.ts',
      'popup/popup': './src/popup/popup.ts',
      'sidepanel/sidepanel': './src/sidepanel/sidepanel.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@modules': path.resolve(__dirname, 'src/modules'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@types': path.resolve(__dirname, 'src/types'),
      },
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'public', to: '.' },
          { from: 'src/content/content.css', to: 'content/content.css' },
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform(content) {
              // Process manifest with icon configuration
              const manifest = JSON.parse(content.toString());

              // Update icon paths from configuration
              manifest.icons = {
                16: iconConfig.manifest[16],
                48: iconConfig.manifest[48],
                128: iconConfig.manifest[128],
              };

              manifest.action.default_icon = {
                16: iconConfig.manifest[16],
                48: iconConfig.manifest[48],
                128: iconConfig.manifest[128],
              };

              return JSON.stringify(manifest, null, 2);
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup/popup.html',
        chunks: ['popup/popup'],
        templateParameters: {
          faviconPath: iconConfig.faviconPath,
        },
      }),
      new HtmlWebpackPlugin({
        template: './src/sidepanel/sidepanel.html',
        filename: 'sidepanel/sidepanel.html',
        chunks: ['sidepanel/sidepanel'],
      }),
      // Inject environment variables into the build
      new webpack.DefinePlugin({
        'process.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(process.env.CLERK_PUBLISHABLE_KEY || ''),
        'process.env.CLERK_AUTHORIZED_DOMAINS': JSON.stringify(process.env.CLERK_AUTHORIZED_DOMAINS || ''),
        'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
        'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY || ''),
        'process.env.OPENAI_MODEL': JSON.stringify(process.env.OPENAI_MODEL || 'gpt-4-vision-preview'),
        'process.env.DIET_API_URL': JSON.stringify(process.env.DIET_API_URL || 'http://localhost:8000'),
        'process.env.JOURNAL_API_URL': JSON.stringify(process.env.JOURNAL_API_URL || 'http://localhost:3000'),
      }),
    ],
  };
};

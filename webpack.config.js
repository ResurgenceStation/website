const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  mode: isDev ? "development" : "production",
  stats: { colors: true, preset: "minimal" },
  performance: { hints: isDev ? false : "warning" },
  devtool: isDev ? "cheap-module-source-map" : "source-map",
  entry: [path.resolve(__dirname, "sass/main.scss")],
  output: {
    filename: "js/[name].js",
    path: path.resolve(__dirname, "_site/assets"),
    publicPath: "/assets/",
  },
  plugins: [
    new WebpackManifestPlugin(),
    new MiniCssExtractPlugin({ filename: "css/[name].css" }),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, "js/"), to: path.resolve(__dirname, "_site/assets/js/") },
        { from: path.resolve(__dirname, "img/"), to: path.resolve(__dirname, "_site/assets/img/") },
      ],
    }),
  ],
  ...(!isDev && {
    optimization: { minimizer: [new TerserPlugin(), new CssMinimizerPlugin()] },
  }),
  module: {
    rules: [
      {
        test: /\.s?css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: { plugins: [require("autoprefixer"), require("postcss-preset-env")] },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset",
        generator: { filename: "assets/img/[name][ext]" },
      },
    ],
  },
};

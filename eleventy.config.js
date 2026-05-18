const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const shortcodes = require("./utils/shortcodes");

function loadYaml(filename) {
  return yaml.load(fs.readFileSync(path.join(__dirname, "_data", filename), "utf-8"));
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addGlobalData("site", loadYaml("site.yaml"));
  eleventyConfig.addGlobalData("nav", loadYaml("nav.yaml"));
  eleventyConfig.addGlobalData("servers", loadYaml("servers.yaml"));
  eleventyConfig.addGlobalData("alerts", loadYaml("alerts.yaml"));

  eleventyConfig.addNunjucksAsyncShortcode("webpack", shortcodes.webpack);
  eleventyConfig.addShortcode("currentBuildDate", () => new Date().toISOString());

  // Cache-bust query string baked at build time. Webpack's manifest plugin
  // does not add [contenthash] to the copied JS bundles (they go through
  // CopyWebpackPlugin, not webpack's regular pipeline), so the
  // /assets/js/*.js URLs are stable. Caddy serves /assets/* with
  // Cache-Control: max-age=31536000, so without this query string a
  // browser that fetched the JS once would never refetch after a content
  // change. Pinning to one buildId per `npm run build` flushes caches
  // exactly when assets actually change.
  const buildId = Date.now().toString(36);
  eleventyConfig.addShortcode("buildId", () => buildId);

  eleventyConfig.addWatchTarget(path.join(__dirname, "_site/assets/manifest.json"));
  eleventyConfig.addWatchTarget(path.join(__dirname, "_data/*.yaml"));

  return {
    dir: {
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
    },
  };
};

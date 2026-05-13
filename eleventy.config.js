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

const handler = (percentage, message, ...args) => {
  // e.g. Output each progress message directly to the console:
  console.info(percentage, message, ...args);
};

module.exports = {
  // https://github.com/vercel/next.js/issues/21079
  // Remove the workaround the issue is fixed
  images: {
    loader: "imgix",
    path: "",
  },
  target: "serverless",
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    
    // config.plugins.push(new webpack.ProgressPlugin(handler));

    return config;
  }
};
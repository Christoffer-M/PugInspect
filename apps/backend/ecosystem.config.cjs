module.exports = {
  apps: [
    {
      name: "puginspect-backend",
      script: "dist/index.js",
      cwd: __dirname,
      interpreter: "node",
    },
  ],
};

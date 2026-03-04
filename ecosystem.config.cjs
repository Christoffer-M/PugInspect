module.exports = {
  apps: [
    {
      name: "puginspect-backend",
      script: "apps/backend/dist/index.js",
      cwd: __dirname,
      interpreter: "node",
    },
  ],
};

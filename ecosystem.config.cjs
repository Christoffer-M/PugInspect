module.exports = {
  apps: [
    {
      name: "puginspect-backend",
      script: "apps/backend/dist/index.js",
      cwd: __dirname,
      interpreter: "node",
      max_restarts: 10,
      restart_delay: 3000,
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      time: true,
    },
  ],
};

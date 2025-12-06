module.exports = {
  apps: [
    // 1. THE ISSUER
    {
      name: "ymh-issuer",
      script: "./apps/issuer/dist/index.js", 
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: "production" }
    },

    // 2. THE COP (Limited)
    // {
    //   name: "ymh-cop",
    //   script: "./apps/cop/dist/index.js",
    //   instances: 1, 
    // },

    // 3. THE MONITOR
    // {
    //   name: "ymh-mon",
    //   script: "./apps/monitor/dist/server.js",
    //   instances: 1,
    //   env: { PORT: 3000 }
    // }
  ]
};
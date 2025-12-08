module.exports = {
  apps: [
    // 1. THE ISSUER
    // {
    //   name: 'ymh-issuer',
    //   script: './apps/issuer/dist/index.js',
    //   instances: 1,
    //   autorestart: true,
    //   env: { NODE_ENV: 'production' },
    //   restart_delay: 1000,
    // },

    // 2. THE WORKER (Limited)
    {
      autorestart: true,
      name: 'ymh-lastfm-worker',
      script: './apps/lastfm-worker/dist/index.js',
      instances: 1,
    },
    {
      autorestart: true,
      name: 'ymh-discogs-worker',
      script: './apps/discogs-worker/dist/index.js',
      instances: 1,
    },
    {
      autorestart: true,
      name: 'ymh-internal-worker',
      script: './apps/internal-worker/dist/index.js',
      instances: 1,
    },
    {
      name: 'ymh-bull-board',
      script: './apps/bull-board/dist/index.js',
      instances: 1,
      autorestart: true,
    },

    // 3. THE MONITOR
    // {
    //   name: "ymh-mon",
    //   script: "./apps/monitor/dist/server.js",
    //   instances: 1,
    //   env: { PORT: 3000 }
    // }
  ],
};

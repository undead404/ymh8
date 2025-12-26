module.exports = {
  apps: [
    {
      autorestart: true,
      instances: 1,
      name: 'ymh-lastfm-worker',
      script: './apps/lastfm-worker/dist/index.js',
      wait_ready: true,
    },
    {
      autorestart: true,
      instances: 1,
      name: 'ymh-discogs-worker',
      script: './apps/discogs-worker/dist/index.js',
      wait_ready: true,
    },
    {
      autorestart: true,
      instances: 1,
      name: 'ymh-internal-worker',
      script: './apps/internal-worker/dist/index.js',
      wait_ready: true,
    },
    {
      autorestart: true,
      instances: 1,
      name: 'ymh-telegram-worker',
      script: './apps/telegram-worker/dist/index.js',
      wait_ready: true,
    },
    {
      autorestart: true,
      instances: 1,
      name: 'ymh-llm-worker',
      script: './apps/llm-worker/dist/index.js',
      wait_ready: true,
    },
    {
      autorestart: true,
      instances: 1,
      name: 'ymh-bull-board',
      script: './apps/bull-board/dist/index.js',
      wait_ready: true,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'ilimbooks-api',
      cwd: '/var/www/ilimbooks/apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3040,
      },
    },
  ],
};

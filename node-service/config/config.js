require('dotenv').config();

module.exports = {
  development: {
    username: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'admin',
    database: process.env.POSTGRES_DB || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres'
  },
  production: {
    username: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'admin',
    database: process.env.POSTGRES_DB || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres'
  }
};


require('dotenv').config();

module.exports = {
  development: {
    username: 'admin',
    password: 'admin',
    database: 'postgres',
    host: '172.17.0.1',
    port: 5432,
    dialect: 'postgres'
  },
  production: {
    username: 'admin',
    password: 'admin',
    database: 'postgres',
    host: '172.17.0.1',
    port: 5432,
    dialect: 'postgres'
  }
};


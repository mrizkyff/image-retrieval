const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'postgres',
  process.env.POSTGRES_USER || 'admin',
  process.env.POSTGRES_PASSWORD || 'admin',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

module.exports = { sequelize };


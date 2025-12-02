const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  image_path: { type: DataTypes.STRING, allowNull: true },
  embedding: { type: DataTypes.JSONB, allowNull: true },
}, {
  tableName: 'Products',
});

module.exports = { Product };


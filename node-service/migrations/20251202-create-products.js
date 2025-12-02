"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Products', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      image_path: { type: Sequelize.STRING, allowNull: true },
      embedding: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Products');
  }
};


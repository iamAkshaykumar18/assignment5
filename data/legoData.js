// data/legoData.js
require('dotenv').config();
require('pg');
const Sequelize = require('sequelize');

class LegoData {
  constructor() {
    // Create Sequelize instance using environment variables
    this.sequelize = new Sequelize(
      process.env.PGDATABASE,
      process.env.PGUSER,
      process.env.PGPASSWORD,
      {
        host: process.env.PGHOST,
        dialect: 'postgres',
        dialectOptions: {
          ssl: process.env.PGSSLMODE === 'true' ? { rejectUnauthorized: false } : false
        },
        logging: false
      }
    );

    // Define models (disable timestamps)
    this.Theme = this.sequelize.define(
      'Theme',
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: Sequelize.STRING
      },
      {
        timestamps: false
      }
    );

    this.Set = this.sequelize.define(
      'Set',
      {
        set_num: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        name: Sequelize.STRING,
        year: Sequelize.INTEGER,
        num_parts: Sequelize.INTEGER,
        theme_id: Sequelize.INTEGER,
        img_url: Sequelize.STRING

      },
      {
        timestamps: false
      }
    );

    // Association
    this.Set.belongsTo(this.Theme, { foreignKey: 'theme_id' });
  }

  /**
   * initialize
   * - syncs DB
   * - if tables empty, inserts initial data (bulk create)
   */
  initialize() {
    return new Promise(async (resolve, reject) => {
      try {
        // Sync models
        await this.sequelize.sync();

        // OPTIONAL: Insert initial data if tables are empty.
        // This mirrors the assignment guidance to insert existing data,
        // but will only run when there are 0 themes in the DB.
        const themeCount = await this.Theme.count();
        if (themeCount === 0) {
          const themeData = [
            { id: 100, name: "Classic Town" },
            { id: 200, name: "Technic" },
            { id: 300, name: "Star Wars" },
            { id: 400, name: "City" }
          ].map(t => ({ id: t.id, name: t.name }));

          // Note: IDs provided here will be used as-is; Sequelize will accept explicit PKs
          await this.Theme.bulkCreate(themeData, { ignoreDuplicates: true });

          const setData = [
            {
              set_num: "001",
              name: "Starter Set",
              year: 2020,
              theme_id: 100,
              num_parts: 50,
              img_url: "https://fakeimg.pl/300x300?text=Starter"
            }
            // Add more if you want; assignment provided a bulkInsert source link
          ];

          await this.Set.bulkCreate(setData, { ignoreDuplicates: true });

          console.log("Initial data inserted into database (themes & sets).");
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Return all sets (include Theme)
  getAllSets() {
    return new Promise(async (resolve, reject) => {
      try {
        const sets = await this.Set.findAll({ include: [this.Theme], order: [['set_num', 'ASC']] });
        resolve(sets);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Return all themes
  getAllThemes() {
    return new Promise(async (resolve, reject) => {
      try {
        const themes = await this.Theme.findAll({ order: [['name', 'ASC']] });
        resolve(themes);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Find set by set_num (resolve with single object)
  getSetByNum(setNum) {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.Set.findAll({
          where: { set_num: setNum },
          include: [this.Theme]
        });

        if (result.length > 0) resolve(result[0]);
        else reject("Unable to find requested set");
      } catch (err) {
        reject(err);
      }
    });
  }

  // Finds sets by theme name (case-insensitive partial match)
  getSetsByTheme(theme) {
    return new Promise(async (resolve, reject) => {
      try {
        const Op = Sequelize.Op;
        const results = await this.Set.findAll({
          include: [this.Theme],
          where: {
            '$Theme.name$': {
              [Op.iLike]: `%${theme}%`
            }
          }
        });

        if (results.length > 0) resolve(results);
        else reject("Unable to find requested sets");
      } catch (err) {
        reject(err);
      }
    });
  }

  // Add a new set
  addSet(newSet) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!newSet || !newSet.set_num) return reject("Invalid set data");

        // create expects the fields for model
        await this.Set.create({
          set_num: newSet.set_num,
          name: newSet.name,
          year: newSet.year ? parseInt(newSet.year) : null,
          num_parts: newSet.num_parts ? parseInt(newSet.num_parts) : null,
          theme_id: newSet.theme_id ? parseInt(newSet.theme_id) : null,
          img_url: newSet.img_url
        });

        resolve();
      } catch (err) {
        // If Sequelize validation error, send a readable message
        if (err && err.errors && err.errors.length > 0) return reject(err.errors[0].message);
        return reject(err);
      }
    });
  }

  // Delete set by set_num
  deleteSetByNum(setNum) {
    return new Promise(async (resolve, reject) => {
      try {
        const deleted = await this.Set.destroy({ where: { set_num: setNum } });
        if (deleted === 0) return reject("Set not found");
        resolve();
      } catch (err) {
        if (err && err.errors && err.errors.length > 0) return reject(err.errors[0].message);
        reject(err);
      }
    });
  }
}

module.exports = LegoData;

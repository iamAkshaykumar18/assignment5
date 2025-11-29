// server.js
/********************************************************************************
*  WEB700 – Assignment 06 (converted to Postgres/Sequelize)
*  Name: Akshay Kumar Rayi    Student ID: 136847241
*  Date: Nov/29/25
********************************************************************************/

require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

const LegoData = require('./data/legoData');

// static folder
app.use(express.static(path.join(__dirname, 'public')));

// form middleware
app.use(express.urlencoded({ extended: true }));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// LegoData instance
const legoData = new LegoData();

legoData.initialize()
  .then(() => {
    app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
  })
  .catch(err => {
    console.log("Initialization Error:", err);
  });

// ---------------------- ROUTES -------------------------

// HOME
app.get('/', (req, res) => {
  res.render('home');
});

// ABOUT
app.get('/about', (req, res) => {
  res.render('about');
});

// ADD SET - FORM
app.get('/lego/addSet', async (req, res) => {
  try {
    const themes = await legoData.getAllThemes();
    res.render('addSet', { themes });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { message: err });
  }
});

// ADD SET - PROCESS FORM
app.post('/lego/addSet', async (req, res) => {
  try {
    // Note: With Sequelize we store theme_id directly from the form (select value)
    await legoData.addSet(req.body);
    res.redirect("/lego/sets");
  } catch (err) {
    console.error("Add Set Error:", err);
    // Use 500 view with message as per assignment instructions
    res.status(500).render('500', { message: err });
  }
});

// SHOW ALL SETS (with optional filter by theme)
app.get('/lego/sets', async (req, res) => {
  try {
    const themes = await legoData.getAllThemes();

    let sets;
    if (req.query.theme) {
      // If query provided, fetch by theme partial match
      sets = await legoData.getSetsByTheme(req.query.theme);
    } else {
      sets = await legoData.getAllSets();
    }

    res.render("sets", { sets, themes });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { message: err });
  }
});

// SINGLE SET DETAILS
app.get('/lego/sets/:set_num', async (req, res) => {
  try {
    const set = await legoData.getSetByNum(req.params.set_num);
    res.render("set", { set });
  } catch (err) {
    console.error(err);
    res.status(404).render('404', { message: err });
  }
});

// DELETE SET
app.get("/lego/deleteSet/:set_num", async (req, res) => {
  try {
    await legoData.deleteSetByNum(req.params.set_num);
    res.redirect("/lego/sets");
  } catch (err) {
    console.error(err);
    res.status(404).render('404', { message: err });
  }
});

// 404 middleware (render 404.ejs with message)
app.use((req, res) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for." });
});

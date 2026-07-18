const path = require('node:path');
const express = require('express');
const homeRoutes = require('./routes/home.routes');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', homeRoutes);

app.use((request, response) => {
  response.status(404).render('pages/not-found', {
    pageTitle: 'Page not found'
  });
});

app.listen(port, () => {
  console.log(`XP Challenge is running at http://localhost:${port}`);
});


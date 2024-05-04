const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const indexRouter = require('./src/routes/indexRouter');
const authRouter = require('./src/routes/authRouter');
const dashboardRouter = require('./src/routes/dashboardRouter');
const adminRouter = require('./src/routes/adminRouter');
const banRouter = require('./src/routes/banRouter');

const db = require('./src/services/db');

const app = express();

app.use(session({
  secret: 'tu_secreto',
  resave: true,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/src/public/css', express.static('src/public/css', { 'Content-Type': 'text/css' }));
app.use('/src/public/js', express.static('src/public/js', { 'Content-Type': 'text/javascript' }));

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', dashboardRouter);
app.use('/', adminRouter);
app.use('/', banRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto http://localhost:${PORT}/`);
});

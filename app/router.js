const express = require('express');
const bodyParser = require('body-parser')
const ERRORS = require('./helper/errors')
const path = require('path')
const exphbs = require('express-handlebars')
const helpers = require('./helper/hbs_helpter')
let app = express();
const web = require('./controller/web')
const product=require('./controller/product')
var compression = require('compression');
app.use(compression());

var session = require('express-session');
app.use(bodyParser.json({limit: '10000kb'}))
app.use(bodyParser.urlencoded({extended: false}))
app.use(session({
  saveUninitialized: false,
  resave: false,
  secret: 'neier', // 建议使用 128 个字符的随机字符串
  cookie: {maxAge: 10 * 24 * 60 * 60 * 1000}
}));
//app.use(express.static(path.join(__dirname, '/../dist')));

app.set('views', path.join(__dirname, '../public'));
let hbs = exphbs.create({
  layoutsDir: 'public/html',
  defaultLayout: 'index',
  extname: '.html',
  helpers: helpers
});
app.engine('html', hbs.engine);
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname, '../public')));


const cookieParser = require('cookie-parser')
app.use(cookieParser())
app.use((req, res, next) => {
  if(req.url.indexOf('/admin/v1/')>-1) {

    if (req.session.userId) {
      next()
    } else {
      if (req.url == '/admin/v1/login') {
        next()
      } else {
        res.send({code: -1002})
        //next()
      }
    }
  }else {
    next()
  }
})

//后台代码
app.use(express.static(path.join(__dirname, '../dist')));
app.get('/admin',function (req,res) {
  console.info('r')
  res.sendFile(path.join(__dirname, '../dist')+'/admin.html')
})
const admin = require('./controller/admin')
const code = require('./controller/code')
const order = require('./controller/order')
app.route('/admin/v1/test').get(code.exportXlsx)
app.route('/admin/v1/users').get(admin.list).post(admin.create).delete(admin.delete)
app.post('/admin/v1/login', admin.login)
app.route('/admin/v1/product').post(product.create).get(product.list).delete(product.delete)
app.route('/admin/v1/code').post(code.list).put(code.createCode)
app.route('/admin/v1/layout').get(admin.layout)
app.get('/admin/v1/list', order.list)
app.get('/admin/v1/info/export',order.exportsFile)
app.post('/admin/v1/status', order.changeStatus)
app.route('/api/v1/vertify-code').post(code.vertify)
app.route('/api/v1/create').post(order.create)

app.get('/', web.index)
app.get('/info', web.info)
app.get('/success', web.success)
module.exports = app

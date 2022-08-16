require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const ejs= require('ejs')
const expressLayout = require('express-ejs-layouts')

const PORT = process.env.PORT||3300
const mongoose = require('mongoose')
const session= require('express-session')
const flash= require('express-flash')
const MongoDbStore= require('connect-mongo')
const passport = require('passport')
const Emitter = require('events')

//Database connection 
const url = process.env.MONGO_CONNECTION_URL
mongoose.connect(url,{ useNewUrlParser:true, useUnifiedTopology:true});
const connection = mongoose.connection;

// mongoose.connect(
//     url,
//     {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     },
//     (err) => {
//       if (err) throw err;
//       console.log("Connected to Database...");
//     }
//   );
connection.once('open',() => {
    console.log('Database connectd ...')
})
connection.on('error', console.error.bind(console,'Connection Error'));

// Event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//Session config.
app.use(session({
    secret:process.env.COOKIE_SECRET,
    resave:false,
    store: MongoDbStore.create({
        mongoUrl: process.env.MONGO_CONNECTION_URL
    }),
    saveUninitialized:false,
    cookie: { maxAge: 1000*60*60*24 }
}))

//passport config
const passportInit = require('./app/config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

//Assets
app.use(express.static('public'))
app.use(express.urlencoded({extended:false}))
app.use(express.json())

//Global middleware
app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})

//Setting template engine
app.use(expressLayout)
app.set('views', path.join(__dirname,'/resources/views'))
app.set('view engine','ejs')

require('./routes/web')(app)

const server = app.listen(PORT, ()=> {
    console.log(`Listening on PORT ${PORT}`)
})


// Socket

const io = require('socket.io')(server)
io.on('connection', (socket) => {
      // Join
      socket.on('join', (orderId) => {
        socket.join(orderId)
      })
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})




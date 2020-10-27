var express = require('express');
var path = require('path');

var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;
var session = require('express-session');

const GithubStrategy = require('passport-github').Strategy
const COOKIE = process.env.PROJECT_DOMAIN;

var mysql = require('mysql');

//const readcsv = require ('readcsv');
var fs = require('fs'); 
var parse = require('csv-parse');

//CSV
var datarow;
var parser = parse({columns: true}, function (err, records) {
	console.log(records[records.length - 1].time);
	datarow = records[10].time;
});


//MYSQL
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin"
});


//TWITTER STRATEGY
passport.use(new Strategy({
    consumerKey: 'NKRSjMME2tlNbNxPQScd07dhC',
    consumerSecret: '2Qlu5zFOmmFqna4OJQNYI0bv7XkdOml2UqsHppcrcFiJ8clzwz',
    callbackURL: 'http://127.0.0.1:1337/sessions/callback'
}, function(token, tokenSecret, profile, callback) {
    return callback(null, profile);
}));

//GITHUB STRATEGY
let scopes = ['notifications', 'user:email', 'read:org', 'repo']
passport.use(
	new GithubStrategy(
		{
			clientID: '682c7e487580cb697515',
			clientSecret: '0fc51df47dabe6826a05cc55f70301c05b5810bc',
			callbackURL: 'http://127.0.0.1:1337/sessions/callbackgit',
			scope: scopes.join(' ')
		},
		function(token, tokenSecret, profile, cb) {
			return cb(null, { profile: profile, token: token })
		}
	)
)

//INITIALIZATION
passport.serializeUser(function(user, callback) {
    callback(null, user);
})

passport.deserializeUser(function(obj, callback) {
    callback(null, obj);
})

var app = express();

//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.set('views', __dirname);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'agent', resave: true, saveUninitialized: true}))

app.use(passport.initialize())
app.use(passport.session())

//MAIN PAGE

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname + '/main.html'));
})

//TWITTER LOGIN
app.get('/twitter/login', passport.authenticate('twitter'))

app.get('/sessions/callback', passport.authenticate('twitter', {
    failureRedirect: '/'
}), function(req, res) {
    res.redirect('/physician')
})

//GITHUB LOGIN
app.get('/github/login', passport.authenticate('github'))

app.get('/sessions/callbackgit', passport.authenticate('github', {
	successRedirect: '/setcookie', failureRedirect: '/' })
)

app.get('/setcookie', function(req, res) {
	let data = {
		user: req.session.passport.user.profile._json,
		token: req.session.passport.user.token
	}
	res.cookie(COOKIE, JSON.stringify(data))
	username = data.user.login;
	res.redirect('/researcher')
})

//PATIENT PAGE (GOOGLE)

app.get('/patient', function(req, res) {
	connection.query('SELECT username, testID, dateTime, Test_SessionID, test_type, Test_IDtest, DataURL '+
	'FROM pd_db.User JOIN pd_db.Therapy ON Therapy.User_IDpatient = User.UserID JOIN pd_db.Test ON Test.Therapy_IDtherapy '+
	'= Therapy.therapyID LEFT JOIN pd_db.Test_Session ON Test_Session.Test_IDtest = Test.testID '+
	'WHERE username = "patient1";', function(error, results, fields) {
		var i;
		var patientData = "";
		for (i = 0; i < results.length; i++) {
		  patientData += "Patient : " + results[i].username + " - Test : " + results[i].test_type + " - Data : " + results[i].DataURL + ' | ';
		}
		console.log(patientData);
			
		fs.createReadStream(__dirname+'/data/data1.csv').pipe(parser);
		
		console.log('h');
		console.log(datarow);
	});
    res.render(path.join(__dirname + '/patient.html'), {datarow:datarow});
})



//PHYSICIAN PAGE (TWITTER)

app.get('/physician', function(req, res) {
    res.render('main', {user: req.user})
})

//RESEARCHER PAGE (GITHUB)

app.get('/researcher', function(req, res) {
    res.render('main', {user: req.user})
})



app.listen(1337, function() {
  console.log('App running on port 1337');
});
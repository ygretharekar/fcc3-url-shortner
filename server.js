// server.js
// where your node app starts

// init
// setup express for handling http requests
var express = require("express");
var app = express();
var bodyParser = require('body-parser');

var validUrl = require('valid-url');
var shortId = require('shortid');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public')); // http://expressjs.com/en/starter/static-files.html
var connected=false;
app.listen(3000);
console.log('Listening on port 3000');
    
// setup nunjucks for templating in views/index.html
var nunjucks = require('nunjucks');
nunjucks.configure('views', { autoescape: true, express: app });

// setup our datastore
var datastore = require("./datastore").sync;
datastore.initializeApp(app);

// create routes
app.get("/", function (request, response) {
  try {
    initializeDatastoreOnProjectCreation();
    var posts = datastore.get("posts");
    response.render('index.html', {
      title: "URL Shortner Microservice",
      posts: posts.reverse()
    });
  } catch (err) {
    console.log("Error: " + err);
    handleError(err, response);
  }
});

app.get('/new/:url(*)', function (req, res, next) {
  var url = req.params.url;
  var entry = {};
  //console.log(url);
  if (validUrl.isUri(url)) {
    //res.send(req.params.url);
    var urls = datastore.get("urls");
    var check = true;
    urls.forEach(
      u => {
       if(u.url == url) {
         check = false;
         entry = u;
       }  
      }
    );

    if(check){
      var shortCode = shortId.generate();
      var entry = {url, shortCode};
      
      urls.push(entry);
    }
    datastore.set("urls", urls);
    res.json(entry);
  } else {
    res.json({ error: "Wrong url format, make sure you have a valid protocol and real site." });
  };
});


app.get( '/:surl',
        function(req, res){
          var urls = datastore.get("urls");
          var url = null;
          
          urls.forEach(
            u => {
              if(u.shortCode == req.params.surl) url = u.url;
            }
          );
          
          res.redirect(url);
        }
);

function handleError(err, response) {
  response.status(500);
  response.send(
    "<html><head><title>Internal Server Error!</title></head><body><pre>"
    + JSON.stringify(err, null, 2) + "</pre></body></pre>"
  );
}

// ------------------------
// DATASTORE INITIALIZATION

function initializeDatastoreOnProjectCreation() {
  if(!connected){
    connected = datastore.connect();
  }
  if (!datastore.get("initialized")) {
    datastore.set("urls", []);
    datastore.set("initialized", true);
  }  
}
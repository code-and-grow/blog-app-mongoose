'use strict'
// load dependencies
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

// use built-in ES6 promises
mongoose.Promise = global.Promise;

// get database endpoints
const { PORT, DATABASE_URL } = require('./config');
// get posts schema
const { Post } = require('./models');

// set up express
const app = express();
app.use(express.json());

// GET requests to /posts
app.get('/posts', (req, res) => {
  Post.find()
    // return 10 posts at once max
    .limit(20)
    // call .serialize method from models.js to build response
    .then(posts => {
      res.json({
        posts: posts.map( post => post.serialize() )
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).send({message: 'Internal server error'});
    });
});
// GET request to /posts/:id
app.get('/posts/:id', (req, res) => {
  Post
    .findById(req.params.id)
    // call .serialize method from models.js to build response
    .then(post => res.json(post.serialize()))
    .catch(err => {
      console.log(err);
      res.status(500).json({message: 'Internal server error'});
    });
});
// POST request to /posts
app.post('/posts', (req, res) => {
  // check for required fields
  const requiredFields = ['title', 'author', 'content'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing required field ${field} in request body`;
      console.log(message);
      return res.status(400).json({message: message});
    }
  }
  // create post 
  Post.create({
    title: req.body.title,
    author: { 
      firstName: req.body.author.firstName,
      lastName: req.body.author.lastName
    },
    content: req.body.content
  })
    .then(post => res.status(201).json(post.serialize()))
    .catch(err => {
      console.log(err);
      res.status(500).json({message: 'Internal server error'});
    });
});
// PUT request to /posts
app.put('/posts/:id', (req, res) => {
  // compare req path and req body ids
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = `Request path id (${req.params.id}) and request body id (${req.body.id}) have to match`;
    console.log(message);
    return res.status(400).json({message: message});
  }
  // look for matching fields in request body
  const toUpdate = {};
  const updateableFields = [
    'title', 
    'content', 
    'author'
  ];
  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  // update fields found 
  Post
    .findByIdAndUpdate(req.params.id, {$set: toUpdate})
    .then(post => res.status(201).end())
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});
// DELETE request to /posts
app.delete('/posts/:id', (req, res) => {
  Post
    .findByIdAndRemove(req.params.id)
    .then(post => res.status(201).end())
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});

// server variable declared globally for easy access
let server;
// start server
function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app
        .listen(port, () => {
          console.log(`Application listening on port ${port}`);
          resolve();
        })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
      }
    );
  });
}
// close server
function closeServer() {
  return mongoose.disconnect().then( () => {
    return new Promise((resolve, reject) => {
      console.log('Shutting down server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// allow server to start with calling 'node server.js'
if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}
// allow test module to start server
module.exports = { app, runServer, closeServer };
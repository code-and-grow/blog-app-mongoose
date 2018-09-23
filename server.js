'use strict'
// load dependencies
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

// use built-in ES6 promises
mongoose.Promise = global.Promise;

// get database endpoints
const { PORT, DATABASE_URL } = require('./config');
// get schemas
const { Author, Post } = require('./models');

// set up express
const app = express();
app.use(express.json());
// set up logging
app.use(morgan('common'));

// GET request to /authors
app.get('/authors', (req, res) => {
  Author
    .find()
    .then(authors => {
      res.json(authors.map( author => {
        return {
          id: author._id,
          name: `${author.firstName} ${author.lastName}`,
          userName: author.userName
        }
      }));
    })
    .catch(err => {
      console.log(err);
      res.status(500).send({message: 'Internal server error'});
    });
});

// POST request to /authors
app.post('/authors', (req, res) => {
  const requiredFields = ['firstName', 'lastName', 'userName'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if(!(field in req.body)) {
      const message = `Required field ${field} missing in request body`;
      console.log(message);
      return res.status(400).json({message: message});
    }
  }
  Author
    .findOne({userName: req.body.userName})
    .then( author => {
      if (author) {
        const message = `Entered username is already taken`;
        console.log(message);
        return res.status(400).json({message: message});
      } else {
        Author.create({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          userName: req.body.userName
        })
        .then( author => {
          res.status(200).json({
            _id: author._id,
            name: `${author.firstName} ${author.lastName}`,
            userName: author.userName
          });
        })
        .catch( err => {
          console.log(err);
          return res.status(500).json({message: 'Error! Unable to add new user!'});
        });
      }
  })
  .catch( err => {
    console.log(err);
    return res.status(500).json({message: 'Unable to connect to server.'});
  });
});

// PUT request to /authors
app.put('/authors/:id', (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = `Request parameters id ${req.params.id} and request body id ${req.body.id} must match`;
    console.log(message);
    return res.status(400).json({ message: message });
  }
  const fieldsToUpdate = {};
  const updateableFields = ['userName', 'firstName', 'lastName'];
  updateableFields.forEach( field => {
    if (field in req.body) {
      fieldsToUpdate[field] = req.body[field];
    }
  });
  Author
    .findOne({userName: fieldsToUpdate.userName})
    .then( author => {
      if (author) {
        const message = `Entered username is already taken`;
        console.log(message);
        return res.status(400).json({message: message});
      } else {
        Author
          .findByIdAndUpdate(req.params.id, {$set: fieldsToUpdate}, {new: true})
          .then( author => { res.status(200).json({
            id:       author._id,
            name:     author.name,
            userName: author.userName
          });
        })
        .catch( err => {
          console.log(err);
          return res.status(500).json({message: 'Internal server error'});
        });
      }
    });
});

// DELETE request to /authors
app.delete('/authors/:id', (req, res) => {
  Post
    .remove({author: req.params.id})
    .then( () => {
      Author
        .findByIdAndRemove(req.params.id)
        .then( () => {
          console.log('Removed user and related posts from database.');
          res.status(204).json({message: 'User removed.'});
        })
        .catch( err => {
          console.log(err);
          return res.status(400).json({message: 'Unable to delete user'});
        });
    })
    .catch( err => {
      console.log(err);
      return res.status(500).json({message: 'Unable to remove user due to server error'});
    });
});

// GET request to /posts
app.get('/posts', (req, res) => {
  Post
    .find()
    .then(posts => {
      res.json(posts.map(post => {
        return {
          id: post._id,
          //author: post.authorName,
          content: post.content,
          title: post.title
        };
      }));
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error.' });
    });
});
// GET request to /posts/:id
app.get('/posts/:id', (req, res) => {
  Post
    .findById(req.params.id)
    .then(post => {
      res.json({
        id: post._id,
        //author: post.authorName,
        content: post.content,
        title: post.title,
        comments: post.comments
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error.' });
    });
});

// POST request to /posts
app.post('/posts', (req, res) => {
  // check for required fields
  const requiredFields = ['title', 'author_id', 'content'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing required field ${field} in request body`;
      console.log(message);
      return res.status(400).json({message: message});
    }
  }
  Author
    .findById(req.body.author_id)
    .then( author => {
      if (author) {
        Post.create({
          title: req.body.title,
          content: req.body.content,
          author: req.body.author_id
        })
        .then( post => 
          res.status(201).json({
            id: post.id,
            title: post.title,
            content: post.content,
            author: `${author.firstName} ${author.lastName}`,
            created: post.created,
            comments: post.comments
          }))
          .catch( err => {
            console.log(err);
            return res.status(500).json({message: 'JSON response not sent.'});
          });
      } else {
        const message = 'Unable to post!';
        console.log(message);
        return res.status(400).json({message: message});
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({message: 'No user found!'});
    });
});
// PUT request to /posts
app.put('/posts/:id', (req, res) => {
  // compare req path and req body ids
  if (!(req.params.id && req.body._id && req.params.id === req.body._id)) {
    const message = `Request path id (${req.params.id}) and request body id (${req.body.id}) have to match`;
    console.log(message);
    return res.status(400).json({message: message});
  }
  // look for matching fields in request body
  const fieldToUpdate = {};
  const updateableFields = [ 'title', 'content' ];
  updateableFields.forEach( field => {
    if (field in req.body) {
      fieldToUpdate[field] = req.body[field];
    }
  });
  // update fields found 
  Post
    .findByIdAndUpdate(req.params.id, {$set: fieldToUpdate}, {new: true})
    .then( post => res.status(200).json({
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author_id,
      created: Date.now().toString()
    }))
    .catch( err => {
      console.log(err);
      return res.status(500).json({message: 'Unable to update post due to server error.'});
    });
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
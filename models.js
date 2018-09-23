'use strict'

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const authorSchema = mongoose.Schema({
  firstName: 'String',
  lastName:  { type: String, required: true },
  userName:  { type: String, unique:   true }
});

const commentSchema = mongoose.Schema({
  content: { type: String }
});

const postSchema = mongoose.Schema({
  title:   { type: String, required: true },
  content: { type: String, required: true },
  author_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  created: { type: Date },
  comments: [ commentSchema ]
});

postSchema.pre('find', function(next) {
  this.populate('author');
  next();
});

postSchema.pre('findByIdAndUpdate', function(next) {
  this.populate('author');
  next();
});

postSchema.pre('findById', function(next) {
  this.populate('author');
  next();
});

postSchema.virtual('authorName').get(function() {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});

postSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    author: this.authorName,
    created: this.created,
    content: this.content,
    comments: this.comments
  }
}

const Author = mongoose.model('Author', authorSchema);
const Post = mongoose.model('Post', postSchema);

module.exports = { Author, Post };

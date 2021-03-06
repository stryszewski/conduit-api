const router = require('express').Router();
const passport = require('passport');
const mongoose = require('mongoose');
const Article = mongoose.model('Article');
const User = mongoose.model('User');
const auth = require('../auth');

// create article
router.post('/', auth.required, function (req, res, next) {
  User.findById(req.payload.id)
      .then(function (user) {
        if (!user) return res.sendStatus(401);

        let article = new Article();

        article.title = req.body.article.title;
        article.description = req.body.article.description;
        article.body = req.body.article.body;
        article.author = user;

        return article.save().then(function () {
          console.log(article.author);
          return res.json({article: article.toJSONFor(user)});
        });
      })
      .catch(next);
});

// Use router.param to intercept & prepopulate article data from the slug
router.param('article', function (req, res, next, slug) {
  Article.findOne({slug: slug})
      .populate('author')
      .then(function (article) {
        if (!article) return res.sendStatus(404);

        req.article = article;

        return next();
      })
      .catch(next);
});

// endpoint for retrieving an article by its slug
router.get('/:article', auth.optional, function (req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.article.populate('author').execPopulate()
  ]).then(function (results) {
    let user = results[0];
    return res.json({article: req.article.toJSONFor(user)});
  }).catch(next);
});

// endpoint for updating articles
router.put('/:article', auth.required, function (req, res, next) {
  User.findById(req.payload.id).then(function (user) {
    if(req.article.author._id.toString() === req.payload.id.toString()) {
      if(typeof req.body.article.title !== 'undefined'){
        req.article.title = req.body.article.title;
      }
      if(typeof req.body.article.description !== 'undefined'){
        req.article.description = req.body.article.description;
      }
      if(typeof req.body.article.body !== 'undefined'){
        req.article.body = req.body.article.body;
      }

      req.article.save().then(function (article) {
        return res.json({article: article.toJSONFor(user)});
      }).catch(next)
    } else {
      return res.sendStatus(403);
    }
  });
});

// endpoint for deleting articles
router.delete('/:article', auth.required, function (req, res, next) {
  User.findById(req.payload.id).then(function (user) {
    if(req.article.author._id.toString() === req.payload.id.toString()) {

      return req.article.remove().then(function () {
        return res.sendStatus(204);
      });
    } else {
      return res.sendStatus(403);
    }
  });
});

//  an endpoint for favoriting an article
router.post('/:article/favorite', auth.required, function (req, res, next) {
  let articleId = req.article._id;
  User.findById(req.payload.id).then(function (user) {
    if(!user) return res.sendStatus(401);

    return user.favorite(articleId).then(function (){
      return req.article.updateFavoriteCount().then(function (article) {
        return res.json({article: article.toJSONFor(user)});
      })
    });
  }).catch(next);
});

//  an endpoint for unfavoriting an article
router.delete('/:article/favorite', auth.required, function (req, res, next) {
  let articleId = req.article._id;
  User.findById(req.payload.id).then(function (user) {
    if(!user) return res.sendStatus(401);

    return user.unfavorite(articleId).then(function (){
      return req.article.updateFavoriteCount().then(function (article) {
        return res.json({article: article.toJSONFor(user)});
      })
    });
  }).catch(next);
});

module.exports = router;
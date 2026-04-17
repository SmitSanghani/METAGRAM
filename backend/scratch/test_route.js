const express = require('express');
const app = express();
const router = express.Router();

router.route("/addpost").post((req, res) => res.send('addpost'));
router.route("/all").get((req, res) => res.send('all'));
router.route("/userpost/all").get((req, res) => res.send('userpost/all'));
router.route("/:id/like").get((req, res) => res.send('like'));
router.route("/:id/dislike").get((req, res) => res.send('dislike'));
router.route("/:id/comment").post((req, res) => res.send('comment'));
router.route("/:id/comment/all").post((req, res) => res.send('comment/all'));
router.route("/comment/delete/:id").delete((req, res) => res.send('comment/delete'));

app.use("/api/v1/post", router);

const request = require('supertest');

request(app)
  .delete('/api/v1/post/comment/delete/123')
  .expect(200)
  .then(response => {
    console.log('Response:', response.text);
    if (response.text === 'comment/delete') {
      console.log('Match successful!');
    } else {
      console.log('Match failed!');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://127.0.0.1:27017/social-media', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(error => console.error('Error connecting to MongoDB:', error));

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  file: String,
  likes: { type: Number, default: 0 },
  comments: [{ text: String }],
});

const Post = mongoose.model('Post', postSchema);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/posts', upload.single('file'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const file = req.file ? req.file.filename : undefined;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required fields' });
    }

    const post = new Post({ title, content, file });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/posts/like/:postId', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.postId, { $inc: { likes: 1 } }, { new: true });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/posts/comment/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.comments.push({ text: req.body.text });
    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = Post;

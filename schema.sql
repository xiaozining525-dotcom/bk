DROP TABLE IF EXISTS users;
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  passwordHash TEXT NOT NULL,
  salt TEXT NOT NULL,
  createdAt INTEGER,
  role TEXT DEFAULT 'editor',
  permissions TEXT
);

DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  tags TEXT,
  category TEXT,
  createdAt INTEGER,
  views INTEGER DEFAULT 0,
  url TEXT,
  status TEXT DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(createdAt);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE TABLE IF NOT EXISTS hangman_words (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE CHECK (word = LOWER(word) AND word ~ '^[a-z]+$'),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hangman_words_category_idx
  ON hangman_words (category);

CREATE TABLE IF NOT EXISTS hangman_player_stats (
  username TEXT PRIMARY KEY CHECK (length(trim(username)) BETWEEN 1 AND 40),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO hangman_words (word, category)
VALUES
  ('alligator', 'animals'),
  ('butterfly', 'animals'),
  ('dolphin', 'animals'),
  ('elephant', 'animals'),
  ('penguin', 'animals'),
  ('france', 'countries'),
  ('canada', 'countries'),
  ('brazil', 'countries'),
  ('germany', 'countries'),
  ('japan', 'countries'),
  ('algorithm', 'programming'),
  ('database', 'programming'),
  ('javascript', 'programming'),
  ('typescript', 'programming'),
  ('variable', 'programming'),
  ('avocado', 'fruits'),
  ('blueberry', 'fruits'),
  ('coconut', 'fruits'),
  ('pineapple', 'fruits'),
  ('watermelon', 'fruits')
ON CONFLICT (word) DO NOTHING;

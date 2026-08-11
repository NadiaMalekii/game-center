CREATE TABLE IF NOT EXISTS sokoban_levels (
  id BIGSERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE CHECK (level_number > 0),
  grid_data JSONB NOT NULL CHECK (jsonb_typeof(grid_data) = 'array'),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sokoban_player_stats (
  username TEXT PRIMARY KEY CHECK (length(trim(username)) BETWEEN 1 AND 40),
  levels_completed INTEGER NOT NULL DEFAULT 0 CHECK (levels_completed >= 0),
  total_moves INTEGER NOT NULL DEFAULT 0 CHECK (total_moves >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sokoban_level_progress (
  username TEXT NOT NULL,
  level_number INTEGER NOT NULL REFERENCES sokoban_levels (level_number) ON DELETE CASCADE,
  best_moves INTEGER NOT NULL CHECK (best_moves > 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, level_number)
);

INSERT INTO sokoban_levels (level_number, grid_data, difficulty)
VALUES
  (1, '["#####", "# . #", "# $ #", "# @ #", "#####"]'::jsonb, 'easy'),
  (2, '["######", "# .. #", "# $$ #", "# @  #", "#    #", "######"]'::jsonb, 'easy'),
  (3, '["#########", "# ...   #", "# $$$   #", "#   @   #", "#       #", "#########"]'::jsonb, 'medium'),
  (4, '["#########", "# .   . #", "#  $ $  #", "#   @   #", "#       #", "#########"]'::jsonb, 'hard'),
  (5, '["##########", "# . . . .#", "# $ $ $ $#", "#   @    #", "#  ###   #", "#        #", "##########"]'::jsonb, 'expert')
ON CONFLICT (level_number) DO NOTHING;

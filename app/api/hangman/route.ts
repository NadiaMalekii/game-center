import { NextRequest, NextResponse } from "next/server";

import { getPool } from "@/lib/db";

type HangmanResultRequest = {
  username?: unknown;
  result?: unknown;
};

type SeedWord = {
  word: string;
  category: string;
};

const MAX_USERNAME_LENGTH = 40;
const MAX_CATEGORY_LENGTH = 40;
const DEFAULT_STATS = { wins: 0, losses: 0, currentStreak: 0 };
const SEED_WORDS: SeedWord[] = [
  { word: "alligator", category: "animals" },
  { word: "butterfly", category: "animals" },
  { word: "dolphin", category: "animals" },
  { word: "elephant", category: "animals" },
  { word: "penguin", category: "animals" },
  { word: "france", category: "countries" },
  { word: "canada", category: "countries" },
  { word: "brazil", category: "countries" },
  { word: "germany", category: "countries" },
  { word: "japan", category: "countries" },
  { word: "algorithm", category: "programming" },
  { word: "database", category: "programming" },
  { word: "javascript", category: "programming" },
  { word: "typescript", category: "programming" },
  { word: "variable", category: "programming" },
  { word: "avocado", category: "fruits" },
  { word: "blueberry", category: "fruits" },
  { word: "coconut", category: "fruits" },
  { word: "pineapple", category: "fruits" },
  { word: "watermelon", category: "fruits" },
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureHangmanSchema() {
  const pool = getPool();

  await pool.query(`
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
  `);

  await pool.query(
    `
      INSERT INTO hangman_words (word, category)
      SELECT seed.word, seed.category
      FROM UNNEST($1::text[], $2::text[]) AS seed(word, category)
      ON CONFLICT (word) DO NOTHING
    `,
    [SEED_WORDS.map(({ word }) => word), SEED_WORDS.map(({ category }) => category)],
  );
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().slice(0, MAX_USERNAME_LENGTH) ?? "";
  const category = request.nextUrl.searchParams.get("category")?.trim().slice(0, MAX_CATEGORY_LENGTH) ?? "";

  try {
    await ensureHangmanSchema();

    const [wordResult, statsResult] = await Promise.all([
      getPool().query(
        `
          SELECT word, category
          FROM hangman_words
          ${category ? "WHERE category = $1" : ""}
          ORDER BY RANDOM()
          LIMIT 1
        `,
        category ? [category] : [],
      ),
      username
        ? getPool().query(
            `
              SELECT wins, losses, current_streak AS "currentStreak"
              FROM hangman_player_stats
              WHERE username = $1
            `,
            [username],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    if (!wordResult.rows[0]) {
      return NextResponse.json({ error: "No Hangman words are available for this category." }, { status: 404 });
    }

    return NextResponse.json({
      word: wordResult.rows[0].word,
      category: wordResult.rows[0].category,
      stats: statsResult.rows[0] ?? DEFAULT_STATS,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load a Hangman word." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: HangmanResultRequest;

  try {
    body = (await request.json()) as HangmanResultRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().slice(0, MAX_USERNAME_LENGTH) : "";
  const result = body.result === "won" || body.result === "lost" ? body.result : "";

  if (!username || !result) {
    return NextResponse.json({ error: "Username and a valid game result are required." }, { status: 400 });
  }

  try {
    await ensureHangmanSchema();

    const { rows } = await getPool().query(
      `
        INSERT INTO hangman_player_stats (username, wins, losses, current_streak)
        VALUES (
          $1,
          CASE WHEN $2 = 'won' THEN 1 ELSE 0 END,
          CASE WHEN $2 = 'lost' THEN 1 ELSE 0 END,
          CASE WHEN $2 = 'won' THEN 1 ELSE 0 END
        )
        ON CONFLICT (username) DO UPDATE SET
          wins = hangman_player_stats.wins + EXCLUDED.wins,
          losses = hangman_player_stats.losses + EXCLUDED.losses,
          current_streak = CASE
            WHEN $2 = 'won' THEN hangman_player_stats.current_streak + 1
            ELSE 0
          END,
          updated_at = NOW()
        RETURNING wins, losses, current_streak AS "currentStreak"
      `,
      [username, result],
    );

    return NextResponse.json({ stats: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save Hangman result." }, { status: 500 });
  }
}

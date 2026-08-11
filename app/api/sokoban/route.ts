import { NextRequest, NextResponse } from "next/server";

import { getPool } from "@/lib/db";

type SokobanResultRequest = {
  username?: unknown;
  levelNumber?: unknown;
  moves?: unknown;
};

type SeedLevel = {
  levelNumber: number;
  gridData: string[];
  difficulty: "easy" | "medium" | "hard" | "expert";
};

const MAX_USERNAME_LENGTH = 40;
const DEFAULT_STATS = { levelsCompleted: 0, totalMoves: 0 };
const SEED_LEVELS: SeedLevel[] = [
  {
    levelNumber: 1,
    gridData: ["#####", "# . #", "# $ #", "# @ #", "#####"],
    difficulty: "easy",
  },
  {
    levelNumber: 2,
    gridData: ["######", "# .. #", "# $$ #", "# @  #", "#    #", "######"],
    difficulty: "easy",
  },
  {
    levelNumber: 3,
    gridData: ["#########", "# ...   #", "# $$$   #", "#   @   #", "#       #", "#########"],
    difficulty: "medium",
  },
  {
    levelNumber: 4,
    gridData: ["#########", "# .   . #", "#  $ $  #", "#   @   #", "#       #", "#########"],
    difficulty: "hard",
  },
  {
    levelNumber: 5,
    gridData: ["##########", "# . . . .#", "# $ $ $ $#", "#   @    #", "#  ###   #", "#        #", "##########"],
    difficulty: "expert",
  },
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSokobanSchema() {
  const pool = getPool();

  await pool.query(`
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
  `);

  await pool.query(
    `
      INSERT INTO sokoban_levels (level_number, grid_data, difficulty)
      SELECT seed.level_number, seed.grid_data, seed.difficulty
      FROM UNNEST($1::int[], $2::jsonb[], $3::text[]) AS seed(level_number, grid_data, difficulty)
      ON CONFLICT (level_number) DO NOTHING
    `,
    [
      SEED_LEVELS.map(({ levelNumber }) => levelNumber),
      SEED_LEVELS.map(({ gridData }) => JSON.stringify(gridData)),
      SEED_LEVELS.map(({ difficulty }) => difficulty),
    ],
  );
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().slice(0, MAX_USERNAME_LENGTH) ?? "";

  try {
    await ensureSokobanSchema();

    const [levelsResult, progressResult, statsResult] = await Promise.all([
      getPool().query(`
        SELECT
          level_number AS "levelNumber",
          grid_data AS "gridData",
          difficulty
        FROM sokoban_levels
        ORDER BY level_number ASC
      `),
      username
        ? getPool().query(
            `
              SELECT
                level_number AS "levelNumber",
                best_moves AS "bestMoves",
                completed_at AS "completedAt"
              FROM sokoban_level_progress
              WHERE username = $1
              ORDER BY level_number ASC
            `,
            [username],
          )
        : Promise.resolve({ rows: [] }),
      username
        ? getPool().query(
            `
              SELECT levels_completed AS "levelsCompleted", total_moves AS "totalMoves"
              FROM sokoban_player_stats
              WHERE username = $1
            `,
            [username],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    return NextResponse.json({
      levels: levelsResult.rows,
      progress: progressResult.rows,
      stats: statsResult.rows[0] ?? DEFAULT_STATS,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load Sokoban levels." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: SokobanResultRequest;

  try {
    body = (await request.json()) as SokobanResultRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().slice(0, MAX_USERNAME_LENGTH) : "";
  const levelNumber = typeof body.levelNumber === "number" ? Math.trunc(body.levelNumber) : NaN;
  const moves = typeof body.moves === "number" ? Math.trunc(body.moves) : NaN;

  if (!username || !Number.isFinite(levelNumber) || !Number.isFinite(moves) || levelNumber < 1 || moves < 1) {
    return NextResponse.json({ error: "Username, level number, and moves are required." }, { status: 400 });
  }

  try {
    await ensureSokobanSchema();

    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      const levelResult = await client.query("SELECT 1 FROM sokoban_levels WHERE level_number = $1", [levelNumber]);
      if (!levelResult.rows[0]) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Sokoban level not found." }, { status: 404 });
      }

      const insertedProgress = await client.query(
        `
          INSERT INTO sokoban_level_progress (username, level_number, best_moves)
          VALUES ($1, $2, $3)
          ON CONFLICT (username, level_number) DO NOTHING
          RETURNING
            level_number AS "levelNumber",
            best_moves AS "bestMoves",
            completed_at AS "completedAt"
        `,
        [username, levelNumber, moves],
      );

      let progress = insertedProgress.rows[0];
      const isFirstCompletion = insertedProgress.rowCount === 1;

      if (!isFirstCompletion) {
        const updatedProgress = await client.query(
          `
            UPDATE sokoban_level_progress
            SET best_moves = LEAST(best_moves, $3), completed_at = NOW()
            WHERE username = $1 AND level_number = $2
            RETURNING
              level_number AS "levelNumber",
              best_moves AS "bestMoves",
              completed_at AS "completedAt"
          `,
          [username, levelNumber, moves],
        );
        progress = updatedProgress.rows[0];
      }

      const statsResult = await client.query(
        `
          INSERT INTO sokoban_player_stats (username, levels_completed, total_moves)
          VALUES ($1, $2, $3)
          ON CONFLICT (username) DO UPDATE SET
            levels_completed = sokoban_player_stats.levels_completed + EXCLUDED.levels_completed,
            total_moves = sokoban_player_stats.total_moves + EXCLUDED.total_moves,
            updated_at = NOW()
          RETURNING levels_completed AS "levelsCompleted", total_moves AS "totalMoves"
        `,
        [username, isFirstCompletion ? 1 : 0, moves],
      );

      await client.query("COMMIT");
      return NextResponse.json({ progress, stats: statsResult.rows[0] }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save Sokoban progress." }, { status: 500 });
  }
}

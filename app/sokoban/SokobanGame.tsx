"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw, Trophy, Undo2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Difficulty = "easy" | "medium" | "hard" | "expert";
type Screen = "select" | "game";
type LoadStatus = "loading" | "ready" | "error";
type GameStatus = "playing" | "won";
type Direction = "up" | "down" | "left" | "right";

type Position = {
  row: number;
  column: number;
};

type BoardState = {
  player: Position;
  boxes: Position[];
};

type SokobanLevel = {
  levelNumber: number;
  gridData: string[];
  difficulty: Difficulty;
};

type LevelProgress = {
  levelNumber: number;
  bestMoves: number;
  completedAt: string;
};

type SokobanStats = {
  levelsCompleted: number;
  totalMoves: number;
};

type SokobanResponse = {
  levels: SokobanLevel[];
  progress: LevelProgress[];
  stats: SokobanStats;
};

type MoveResult = {
  board: BoardState;
  moved: boolean;
};

const DIRECTIONS: Record<Direction, Position> = {
  up: { row: -1, column: 0 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
};

const KEYBOARD_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "bg-emerald-400/15 text-emerald-300",
  medium: "bg-sky-400/15 text-sky-300",
  hard: "bg-amber-400/15 text-amber-300",
  expert: "bg-fuchsia-400/15 text-fuchsia-300",
};

async function fetchSokobanData(username: string): Promise<SokobanResponse> {
  const response = await fetch(`/api/sokoban?username=${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load Sokoban levels.");

  return (await response.json()) as SokobanResponse;
}

async function saveSokobanResult(username: string, levelNumber: number, moves: number) {
  const response = await fetch("/api/sokoban", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, levelNumber, moves }),
  });

  if (!response.ok) throw new Error("Could not save Sokoban progress.");

  return (await response.json()) as { progress: LevelProgress; stats: SokobanStats };
}

function positionKey(position: Position) {
  return `${position.row}:${position.column}`;
}

function positionsMatch(first: Position, second: Position) {
  return first.row === second.row && first.column === second.column;
}

function parseLevel(gridData: string[]): BoardState {
  const boxes: Position[] = [];
  let player = { row: 0, column: 0 };

  gridData.forEach((row, rowIndex) => {
    [...row].forEach((tile, column) => {
      if (tile === "$" || tile === "*") boxes.push({ row: rowIndex, column });
      if (tile === "@" || tile === "+") player = { row: rowIndex, column };
    });
  });

  return { player, boxes };
}

function getTargets(gridData: string[]) {
  const targets: Position[] = [];

  gridData.forEach((row, rowIndex) => {
    [...row].forEach((tile, column) => {
      if (tile === "." || tile === "*" || tile === "+") targets.push({ row: rowIndex, column });
    });
  });

  return targets;
}

function isWall(gridData: string[], position: Position) {
  return gridData[position.row]?.[position.column] === "#" || gridData[position.row]?.[position.column] === undefined;
}

function isSolved(board: BoardState, gridData: string[]) {
  const targets = getTargets(gridData);
  return targets.length > 0 && targets.every((target) => board.boxes.some((box) => positionsMatch(box, target)));
}

function tryMove(board: BoardState, gridData: string[], direction: Direction): MoveResult {
  const delta = DIRECTIONS[direction];
  const nextPlayer = {
    row: board.player.row + delta.row,
    column: board.player.column + delta.column,
  };

  if (isWall(gridData, nextPlayer)) return { board, moved: false };

  const boxIndex = board.boxes.findIndex((box) => positionsMatch(box, nextPlayer));
  let nextBoxes = board.boxes;

  if (boxIndex !== -1) {
    const nextBox = {
      row: nextPlayer.row + delta.row,
      column: nextPlayer.column + delta.column,
    };

    if (isWall(gridData, nextBox) || board.boxes.some((box, index) => index !== boxIndex && positionsMatch(box, nextBox))) {
      return { board, moved: false };
    }

    nextBoxes = board.boxes.map((box, index) => (index === boxIndex ? nextBox : box));
  }

  return {
    board: { player: nextPlayer, boxes: nextBoxes },
    moved: true,
  };
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export default function SokobanGame() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() ?? "";
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [screen, setScreen] = useState<Screen>("select");
  const [levels, setLevels] = useState<SokobanLevel[]>([]);
  const [progress, setProgress] = useState<LevelProgress[]>([]);
  const [stats, setStats] = useState<SokobanStats>({ levelsCompleted: 0, totalMoves: 0 });
  const [activeLevelNumber, setActiveLevelNumber] = useState<number | null>(null);
  const [activeOwner, setActiveOwner] = useState("");
  const [board, setBoard] = useState<BoardState | null>(null);
  const [history, setHistory] = useState<BoardState[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [error, setError] = useState("");
  const [savedResult, setSavedResult] = useState(false);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    setLoadStatus("loading");
    setScreen("select");
    setActiveLevelNumber(null);
    setActiveOwner("");
    setBoard(null);
    setError("");

    fetchSokobanData(username)
      .then((data) => {
        if (cancelled) return;

        setLevels(data.levels);
        setProgress(data.progress);
        setStats(data.stats);
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadStatus("error");
          setError("Could not load levels. Check the PostgreSQL connection and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadAttempt, username]);

  useEffect(() => {
    if (screen !== "game" || gameStatus !== "playing") return;

    const timer = window.setInterval(() => {
      setSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameStatus, screen, activeLevelNumber]);

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const direction = KEYBOARD_DIRECTIONS[event.key];
      if (!direction || screen !== "game" || gameStatus !== "playing") return;

      event.preventDefault();
      movePlayer(direction);
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [board, gameStatus, screen, activeLevelNumber]);

  useEffect(() => {
    if (gameStatus !== "won" || activeLevelNumber === null || activeOwner !== username || !username || savedResult) return;

    setSavedResult(true);
    saveSokobanResult(username, activeLevelNumber, moves)
      .then((data) => {
        setStats(data.stats);
        setProgress((currentProgress) => {
          const existing = currentProgress.find((item) => item.levelNumber === data.progress.levelNumber);
          if (!existing) return [...currentProgress, data.progress].sort((first, second) => first.levelNumber - second.levelNumber);

          return currentProgress.map((item) => (item.levelNumber === data.progress.levelNumber ? data.progress : item));
        });
        setError("");
      })
      .catch(() => setError("This level is solved, but the result could not be saved."));
  }, [activeLevelNumber, activeOwner, gameStatus, moves, savedResult, username]);

  const activeLevel = levels.find((level) => level.levelNumber === activeLevelNumber) ?? null;
  const currentProgress = progress.find((item) => item.levelNumber === activeLevelNumber) ?? null;

  function isLevelUnlocked(level: SokobanLevel) {
    const levelIndex = levels.findIndex((item) => item.levelNumber === level.levelNumber);
    return levelIndex === 0 || progress.some((item) => item.levelNumber === levels[levelIndex - 1]?.levelNumber);
  }

  function startLevel(level: SokobanLevel) {
    if (!isLevelUnlocked(level)) return;

    setSavedResult(false);
    setActiveLevelNumber(level.levelNumber);
    setActiveOwner(username);
    setBoard(parseLevel(level.gridData));
    setHistory([]);
    setMoves(0);
    setSeconds(0);
    setGameStatus("playing");
    setScreen("game");
    setError("");
  }

  function goToLevelSelect() {
    setScreen("select");
    setActiveLevelNumber(null);
    setActiveOwner("");
    setBoard(null);
    setHistory([]);
    setError("");
  }

  function resetLevel() {
    if (!activeLevel) return;

    setSavedResult(false);
    setBoard(parseLevel(activeLevel.gridData));
    setHistory([]);
    setMoves(0);
    setSeconds(0);
    setGameStatus("playing");
    setError("");
  }

  function undoMove() {
    if (!board || !history.length || gameStatus !== "playing") return;

    setBoard(history[history.length - 1]);
    setHistory((currentHistory) => currentHistory.slice(0, -1));
    setMoves((currentMoves) => Math.max(0, currentMoves - 1));
  }

  function movePlayer(direction: Direction) {
    if (!board || !activeLevel || gameStatus !== "playing") return;

    const result = tryMove(board, activeLevel.gridData, direction);
    if (!result.moved) return;

    setHistory((currentHistory) => [...currentHistory, board]);
    setBoard(result.board);
    setMoves((currentMoves) => currentMoves + 1);

    if (isSolved(result.board, activeLevel.gridData)) setGameStatus("won");
  }

  function goToNextLevel() {
    if (!activeLevel) return;

    const currentIndex = levels.findIndex((level) => level.levelNumber === activeLevel.levelNumber);
    const nextLevel = levels[currentIndex + 1];
    if (nextLevel) {
      startLevel(nextLevel);
    } else {
      goToLevelSelect();
    }
  }

  if (!username) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-primary/20 bg-card/90 backdrop-blur">
          <CardHeader>
            <Button asChild className="mb-3 w-fit" size="sm" variant="ghost">
              <Link href="/"><ArrowLeft className="h-4 w-4" /> Games</Link>
            </Button>
            <CardTitle className="text-3xl">Login required</CardTitle>
            <CardDescription>Enter your username on the start page before playing Sokoban.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (loadStatus !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-primary/20 bg-card/90 backdrop-blur">
          <CardHeader>
            <Button asChild className="mb-3 w-fit" size="sm" variant="ghost">
              <Link href={`/?username=${encodeURIComponent(username)}`}><ArrowLeft className="h-4 w-4" /> Games</Link>
            </Button>
            <CardTitle className="text-3xl">{loadStatus === "loading" ? "Loading Sokoban" : "Could not load Sokoban"}</CardTitle>
            <CardDescription>{loadStatus === "loading" ? "Fetching levels and your PostgreSQL progress." : error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadStatus === "error" ? (
              <Button className="w-full" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</Button>
            ) : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-6 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6 lg:px-8">
      <section className="flex flex-col gap-4 lg:gap-6">
        {screen === "select" ? (
          <>
            <div className="rounded-2xl border bg-card/70 p-4 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-5">
              <Button asChild className="mb-3 -ml-2" size="sm" variant="ghost">
                <Link href={`/?username=${encodeURIComponent(username)}`}><ArrowLeft className="h-4 w-4" /> Games</Link>
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Box / Puzzle Game</p>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Sokoban</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a level, {username}.</p>
                </div>
                <div className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium">{stats.levelsCompleted}/{levels.length} complete</div>
              </div>
            </div>

            <Card className="border-primary/20 bg-slate-950/80">
              <CardHeader>
                <CardTitle>Level Select</CardTitle>
                <CardDescription>Push every box onto a target. Complete levels in order to unlock the next challenge.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {levels.map((level) => {
                  const levelProgress = progress.find((item) => item.levelNumber === level.levelNumber);
                  const isUnlocked = isLevelUnlocked(level);

                  return (
                    <button
                      className={`rounded-2xl border p-4 text-left transition ${
                        isUnlocked
                          ? "border-primary/20 bg-secondary/70 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-secondary"
                          : "cursor-not-allowed border-white/5 bg-secondary/30 opacity-45"
                      }`}
                      disabled={!isUnlocked}
                      key={level.levelNumber}
                      onClick={() => startLevel(level)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">Level {level.levelNumber}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {levelProgress ? `Best: ${levelProgress.bestMoves} moves` : isUnlocked ? "Ready to play" : "Locked"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${DIFFICULTY_STYLES[level.difficulty]}`}>
                          {level.difficulty}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="rounded-2xl border bg-card/70 p-4 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Button className="mb-3 -ml-2" onClick={goToLevelSelect} size="sm" variant="ghost">
                    <ArrowLeft className="h-4 w-4" /> Levels
                  </Button>
                  <p className="text-sm text-muted-foreground">Box / Puzzle Game</p>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Level {activeLevel?.levelNumber}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Playing as {username}</p>
                </div>
                <Button className="w-full sm:w-auto" onClick={resetLevel} variant="secondary">
                  <RotateCcw className="h-4 w-4" /> Reset level
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-primary/20 bg-slate-950/80">
              <CardHeader className="grid grid-cols-3 gap-2 px-4 py-4 sm:px-6">
                <Stat label="Moves" value={moves} />
                <Stat label="Time" value={formatTime(seconds)} />
                <Stat label="Best" value={currentProgress ? `${currentProgress.bestMoves}` : "-"} />
              </CardHeader>
              <CardContent className="space-y-5 px-3 pb-4 sm:px-6 sm:pb-6">
                {gameStatus === "won" ? (
                  <div className="rounded-2xl bg-primary px-4 py-4 text-center text-primary-foreground" role="status">
                    <p className="font-bold">Level complete!</p>
                    <p className="mt-1 text-sm">Solved in {moves} moves and {formatTime(seconds)}.</p>
                    <Button className="mt-3 bg-background text-foreground hover:bg-background/90" onClick={goToNextLevel}>
                      {activeLevel && levels[levels.findIndex((level) => level.levelNumber === activeLevel.levelNumber) + 1] ? "Next Level" : "Back to Levels"}
                    </Button>
                  </div>
                ) : null}
                {error ? <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}

                {activeLevel && board ? <SokobanBoard level={activeLevel} board={board} /> : null}

                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button disabled={!history.length || gameStatus !== "playing"} onClick={undoMove} variant="outline">
                      <Undo2 className="h-4 w-4" /> Undo move
                    </Button>
                    <Button disabled={gameStatus !== "playing"} onClick={resetLevel} variant="secondary">
                      <RotateCcw className="h-4 w-4" /> Reset level
                    </Button>
                  </div>
                  <div aria-label="Sokoban movement controls" className="grid w-40 grid-cols-3 gap-2">
                    <span />
                    <Button aria-label="Move up" className="h-12" disabled={gameStatus !== "playing"} onClick={() => movePlayer("up")} size="icon" variant="secondary">
                      <ChevronUp className="h-5 w-5" />
                    </Button>
                    <span />
                    <Button aria-label="Move left" className="h-12" disabled={gameStatus !== "playing"} onClick={() => movePlayer("left")} size="icon" variant="secondary">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button aria-label="Move down" className="h-12" disabled={gameStatus !== "playing"} onClick={() => movePlayer("down")} size="icon" variant="secondary">
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                    <Button aria-label="Move right" className="h-12" disabled={gameStatus !== "playing"} onClick={() => movePlayer("right")} size="icon" variant="secondary">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">Use the arrow keys or the controls above to move.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <aside className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-6">
        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Sokoban Stats</CardTitle>
            <CardDescription>Your progress is saved in PostgreSQL.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Stat label="Levels completed" value={stats.levelsCompleted} />
            <Stat label="Total moves" value={stats.totalMoves} />
            <Stat label="Best levels" value={progress.length} />
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> How to Play</CardTitle>
            <CardDescription>Plan every push before you move.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Walk onto a box to push it one square. Boxes cannot be pulled back.</p>
            <p>Place every box on a glowing target to solve the level.</p>
            <p>Undo a move when a push sends a box into the wrong corner.</p>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function SokobanBoard({ level, board }: { level: SokobanLevel; board: BoardState }) {
  const columns = Math.max(...level.gridData.map((row) => row.length));

  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/20 bg-background/40 p-2 sm:p-4">
      <div
        aria-label={`Sokoban level ${level.levelNumber} board`}
        className="mx-auto grid w-fit gap-1 sm:gap-1.5"
        role="grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {level.gridData.flatMap((row, rowIndex) =>
          [...row].map((tile, column) => {
            const position = { row: rowIndex, column };
            const target = tile === "." || tile === "*" || tile === "+";
            const box = board.boxes.some((item) => positionsMatch(item, position));
            const player = positionsMatch(board.player, position);
            const isBoxOnTarget = box && target;
            const cellLabel = tile === "#" ? "Wall" : player ? "Player" : box ? (isBoxOnTarget ? "Box on target" : "Box") : target ? "Target" : "Open floor";

            return (
              <div
                aria-label={cellLabel}
                className={`relative flex h-9 w-9 items-center justify-center rounded-md sm:h-11 sm:w-11 ${tile === "#" ? "bg-slate-700 shadow-inner" : "bg-slate-900/90"}`}
                key={`${rowIndex}-${column}`}
                role="gridcell"
              >
                {tile === "#" ? <div className="h-2/3 w-2/3 rounded bg-slate-600/70" /> : null}
                {target ? <div className="absolute h-1/2 w-1/2 rounded-full border-2 border-amber-300/80 bg-amber-300/15" /> : null}
                {box ? (
                  <div className={`relative z-10 h-[72%] w-[72%] rounded-md border-2 shadow-lg ${isBoxOnTarget ? "border-emerald-200 bg-primary shadow-primary/40" : "border-amber-200/80 bg-amber-500 shadow-amber-500/30"}`}>
                    <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/20" />
                  </div>
                ) : null}
                {player ? <div className="relative z-20 h-[62%] w-[62%] rounded-full border-2 border-sky-100 bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.65)]" /> : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, Trophy, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GameStatus = "loading" | "playing" | "won" | "lost";

type HangmanStats = {
  wins: number;
  losses: number;
  currentStreak: number;
};

type HangmanRound = {
  word: string;
  category: string;
  stats: HangmanStats;
};

const MAX_WRONG_GUESSES = 6;
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

async function fetchHangmanRound(username: string): Promise<HangmanRound> {
  const response = await fetch(`/api/hangman?username=${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load a Hangman word.");

  return (await response.json()) as HangmanRound;
}

async function saveHangmanResult(username: string, result: "won" | "lost") {
  const response = await fetch("/api/hangman", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, result }),
  });

  if (!response.ok) throw new Error("Could not save the Hangman result.");

  return (await response.json()) as { stats: HangmanStats };
}

export default function HangmanGame() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() ?? "";
  const [roundNumber, setRoundNumber] = useState(0);
  const [word, setWord] = useState("");
  const [category, setCategory] = useState("");
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [stats, setStats] = useState<HangmanStats>({ wins: 0, losses: 0, currentStreak: 0 });
  const [roundOwner, setRoundOwner] = useState("");
  const [error, setError] = useState("");
  const savedResultRef = useRef(false);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    savedResultRef.current = false;
    setStatus("loading");
    setWord("");
    setCategory("");
    setGuessedLetters([]);
    setRoundOwner("");
    setError("");

    fetchHangmanRound(username)
      .then((round) => {
        if (cancelled) return;

        setWord(round.word.toLowerCase());
        setCategory(round.category);
        setStats(round.stats);
        setRoundOwner(username);
        setStatus("playing");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load a word. Check the PostgreSQL connection and try again.");
          setStatus("loading");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [roundNumber, username]);

  useEffect(() => {
    if ((status !== "won" && status !== "lost") || !username || !word || roundOwner !== username || savedResultRef.current) {
      return;
    }

    savedResultRef.current = true;
    saveHangmanResult(username, status)
      .then((data) => {
        setStats(data.stats);
        setError("");
      })
      .catch(() => setError("The round ended, but its result could not be saved."));
  }, [roundOwner, status, username, word]);

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const letter = event.key.toLowerCase();
      if (!/^[a-z]$/.test(letter) || status !== "playing" || guessedLetters.includes(letter)) return;

      event.preventDefault();
      guessLetter(letter);
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [guessedLetters, status, word]);

  const wrongGuesses = guessedLetters.filter((letter) => !word.includes(letter));
  const isRoundOver = status === "won" || status === "lost";
  const gamesPlayed = stats.wins + stats.losses;

  function guessLetter(letter: string) {
    if (status !== "playing" || guessedLetters.includes(letter) || !word) return;

    const nextGuesses = [...guessedLetters, letter];
    const nextWrongGuesses = nextGuesses.filter((guessedLetter) => !word.includes(guessedLetter));
    const hasGuessedEveryLetter = [...new Set(word)].every((wordLetter) => nextGuesses.includes(wordLetter));

    setGuessedLetters(nextGuesses);

    if (hasGuessedEveryLetter) {
      setStatus("won");
    } else if (nextWrongGuesses.length >= MAX_WRONG_GUESSES) {
      setStatus("lost");
    }
  }

  function playAgain() {
    savedResultRef.current = false;
    setStatus("loading");
    setWord("");
    setCategory("");
    setGuessedLetters([]);
    setRoundOwner("");
    setError("");
    setRoundNumber((currentRound) => currentRound + 1);
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
            <CardDescription>Enter your username on the start page before playing Hangman.</CardDescription>
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-6 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6 lg:px-8">
      <section className="flex flex-col gap-4 lg:gap-6">
        <div className="rounded-2xl border bg-card/70 p-4 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-5">
          <Button asChild className="mb-3 -ml-2" size="sm" variant="ghost">
            <Link href={`/?username=${encodeURIComponent(username)}`}><ArrowLeft className="h-4 w-4" /> Games</Link>
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Word / Letter Game</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Hangman</h1>
              <p className="mt-1 text-sm text-muted-foreground">Playing as {username}</p>
            </div>
            <Button className="w-full sm:w-auto" onClick={playAgain} variant="secondary">
              <RotateCcw className="h-4 w-4" /> Play Again
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-slate-950/80">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 px-4 py-4 sm:px-6">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Guess the word</CardTitle>
              <CardDescription>
                Category: <span className="capitalize text-foreground">{category || "Loading"}</span>
              </CardDescription>
            </div>
            <div className="rounded-lg bg-secondary px-3 py-2 text-right text-sm">
              <p className="text-xs text-muted-foreground">Mistakes</p>
              <p className="font-bold">{wrongGuesses.length}/{MAX_WRONG_GUESSES}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-3 pb-4 sm:px-6 sm:pb-6">
            {status === "won" ? (
              <div className="rounded-2xl bg-primary px-4 py-3 text-center font-bold text-primary-foreground" role="status">
                You won. The word was {word.toUpperCase()}!
              </div>
            ) : null}
            {status === "lost" ? (
              <div className="rounded-2xl bg-destructive px-4 py-3 text-center font-bold text-destructive-foreground" role="status">
                Game over. The correct word was {word.toUpperCase()}.
              </div>
            ) : null}
            {error ? <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}

            <div className="grid items-center gap-5 rounded-2xl border border-white/10 bg-background/30 p-4 sm:p-6 md:grid-cols-[13rem_1fr]">
              <HangmanFigure wrongGuesses={wrongGuesses.length} />
              <div className="min-w-0 text-center">
                {status === "loading" ? (
                  <p className="py-8 text-sm text-muted-foreground">Loading a new word...</p>
                ) : (
                  <>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Word status</p>
                    <div
                      aria-label={`Word status: ${word
                        .split("")
                        .map((letter) => (status === "lost" || guessedLetters.includes(letter) ? letter : "blank"))
                        .join(" ")}`}
                      className="flex flex-wrap justify-center gap-2"
                    >
                      {word.split("").map((letter, index) => {
                        const isRevealed = status === "lost" || guessedLetters.includes(letter);

                        return (
                          <span className="flex h-12 min-w-9 items-center justify-center border-b-2 border-primary px-1 text-2xl font-black sm:h-14 sm:min-w-11 sm:text-3xl" key={`${letter}-${index}`}>
                            {isRevealed ? letter.toUpperCase() : "_"}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {isRoundOver ? "Start another round whenever you are ready." : "Choose a letter or use your physical keyboard."}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Previously guessed</h2>
                  <p className="text-xs text-muted-foreground">Letters cannot be selected twice.</p>
                </div>
                <span className="text-sm font-bold">{guessedLetters.length}</span>
              </div>
              {guessedLetters.length ? (
                <div className="flex flex-wrap gap-2" aria-label="Previously guessed letters">
                  {guessedLetters.map((letter) => (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${word.includes(letter) ? "bg-primary text-primary-foreground" : "bg-destructive/80 text-destructive-foreground"}`}
                      key={letter}
                    >
                      {letter.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No letters guessed yet.</p>
              )}
            </div>

            <div aria-label="Hangman keyboard" className="space-y-2">
              {KEYBOARD_ROWS.map((row) => (
                <div className="flex justify-center gap-1.5 sm:gap-2" key={row}>
                  {[...row].map((letter) => {
                    const normalizedLetter = letter.toLowerCase();
                    const isGuessed = guessedLetters.includes(normalizedLetter);
                    const isCorrect = isGuessed && word.includes(normalizedLetter);

                    return (
                      <button
                        className={`h-10 min-w-[2rem] rounded-md border px-1 text-sm font-bold transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60 sm:h-11 sm:min-w-[2.75rem] ${
                          isGuessed
                            ? isCorrect
                              ? "border-primary/50 bg-primary text-primary-foreground"
                              : "border-destructive/50 bg-destructive/80 text-destructive-foreground"
                            : "border-white/10 bg-secondary text-secondary-foreground hover:border-primary/50 hover:bg-accent"
                        }`}
                        disabled={status !== "playing" || isGuessed}
                        key={letter}
                        onClick={() => guessLetter(normalizedLetter)}
                        type="button"
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-6">
        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Hangman Stats</CardTitle>
            <CardDescription>Your progress is saved in PostgreSQL.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Stat label="Wins" value={stats.wins} />
            <Stat label="Losses" value={stats.losses} />
            <Stat label="Current streak" value={stats.currentStreak} />
            <Stat label="Games played" value={gamesPlayed} />
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> How to Play</CardTitle>
            <CardDescription>Keep the drawing clear and solve the word.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Guess one letter at a time. Correct letters stay visible in the word.</p>
            <p>Every wrong guess reveals another SVG stage. You have {MAX_WRONG_GUESSES} mistakes.</p>
            <p>Win consecutive rounds to grow your current streak.</p>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function HangmanFigure({ wrongGuesses }: { wrongGuesses: number }) {
  return (
    <div className="mx-auto w-full max-w-[13rem]">
      <svg
        aria-label={`Hangman drawing with ${wrongGuesses} of ${MAX_WRONG_GUESSES} stages revealed`}
        className="h-auto w-full text-slate-300"
        role="img"
        viewBox="0 0 220 240"
      >
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7">
          <path className="text-slate-700" d="M30 218h158M55 218V26h105M55 26h70M125 26v21" />
          {wrongGuesses >= 1 ? <circle className="hangman-drawing-part text-amber-300" cx="125" cy="69" r="22" pathLength={1} /> : null}
          {wrongGuesses >= 2 ? <path className="hangman-drawing-part text-amber-300" d="M125 91v62" pathLength={1} /> : null}
          {wrongGuesses >= 3 ? <path className="hangman-drawing-part text-amber-300" d="m125 105-34 32" pathLength={1} /> : null}
          {wrongGuesses >= 4 ? <path className="hangman-drawing-part text-amber-300" d="m125 105 34 32" pathLength={1} /> : null}
          {wrongGuesses >= 5 ? <path className="hangman-drawing-part text-amber-300" d="m125 153-33 42" pathLength={1} /> : null}
          {wrongGuesses >= 6 ? <path className="hangman-drawing-part text-amber-300" d="m125 153 33 42" pathLength={1} /> : null}
        </g>
      </svg>
      <p className="text-center text-xs text-muted-foreground">{wrongGuesses} stages revealed</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

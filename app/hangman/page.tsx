import { Suspense } from "react";

import HangmanGame from "./HangmanGame";

export default function HangmanPage() {
  return (
    <Suspense fallback={null}>
      <HangmanGame />
    </Suspense>
  );
}

import { Suspense } from "react";

import SokobanGame from "./SokobanGame";

export default function SokobanPage() {
  return (
    <Suspense fallback={null}>
      <SokobanGame />
    </Suspense>
  );
}

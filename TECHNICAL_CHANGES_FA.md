  # مستند فنی کامل پروژه Game Center

  این فایل یک توضیح فنی کامل از کل پروژه است، نه فقط تغییرات اخیر. ساختار پروژه، فایل‌ها، جریان اجرای برنامه، منطق بازی‌ها، APIها، دیتابیس، Docker، تنظیمات Build و نکات عملیاتی در این سند پوشش داده شده‌اند.

  ## معرفی پروژه

  `Game Center` یک برنامه Next.js است که دو بازی مرورگری دارد:

  - Snake
  - Memory Match

  کاربر ابتدا در صفحه اصلی یک username وارد می‌کند. این username برای ورود به صفحه بازی استفاده می‌شود و رکوردها در PostgreSQL ثبت و نمایش داده می‌شوند. هر بازی صفحه جداگانه، منطق داخلی، نمایش امتیاز، و Leaderboard دارد.

  برنامه از یک لایه ذخیره‌سازی استفاده می‌کند:

  - PostgreSQL برای ذخیره دائمی و مشترک امتیازها بین کاربران و دستگاه‌ها.

  ## تکنولوژی‌ها

  - Next.js 16
  - React 19
  - TypeScript
  - Tailwind CSS 4
  - PostgreSQL
  - Docker و Docker Compose
  - pg برای اتصال Node.js به PostgreSQL
  - lucide-react برای آیکن‌ها
  - shadcn-style UI primitives برای Button، Card و Input

  ## ساختار کلی پوشه‌ها

  ```txt
  game-center/
    app/
      api/
        memory-scores/
          route.ts
        snake-scores/
          route.ts
      memory/
        page.tsx
      snake/
        page.tsx
      globals.css
      layout.tsx
      page.tsx
    components/
      ui/
        button.tsx
        card.tsx
        input.tsx
    lib/
      db.ts
      local-scores.ts
      profile.ts
      utils.ts
    public/
      .gitkeep
    .github/
      workflows/
        deploy.yml
    .dockerignore
    .env.example
    .gitignore
    Dockerfile
    Dockerfile.dev
    compose.yaml
    components.json
    next.config.ts
    package.json
    package-lock.json
    postcss.config.mjs
    tsconfig.json
    LICENSE
  ```

  پوشه‌های `node_modules/` و `.next/` خروجی نصب dependency و build هستند و بخشی از سورس اصلی محسوب نمی‌شوند.

  ## package.json

  فایل `package.json` مشخصات پروژه، اسکریپت‌ها و dependencyها را نگه می‌دارد.

  اسکریپت‌ها:

  ```json
  {
    "dev": "next dev --webpack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
  ```

  توضیح:

  - `dev`: برنامه را در حالت توسعه اجرا می‌کند. از `--webpack` استفاده شده تا Turbopack در local باعث ایجاد تعداد زیاد پردازش Node نشود.
  - `build`: نسخه Production برنامه را می‌سازد.
  - `start`: نسخه build شده را اجرا می‌کند.
  - `lint`: برای lint در نظر گرفته شده، ولی در Next.js نسخه‌های جدید ممکن است نیاز به تنظیم جداگانه داشته باشد.

  dependencyهای اصلی:

  - `next`: فریم‌ورک اصلی برنامه.
  - `react` و `react-dom`: UI runtime.
  - `pg`: اتصال به PostgreSQL.
  - `lucide-react`: آیکن‌ها.
  - `class-variance-authority`: تعریف variant برای کامپوننت Button.
  - `clsx` و `tailwind-merge`: ساخت کلاس‌های CSS ترکیبی و بدون conflict.
  - `@radix-ui/react-slot`: پشتیبانی از `asChild` در Button.

  devDependencyها:

  - TypeScript و typeهای React/Node/pg.
  - Tailwind CSS و PostCSS plugin مربوط به آن.

  ## next.config.ts

  فایل `next.config.ts` تنظیمات Next.js را مشخص می‌کند:

  ```ts
  const nextConfig: NextConfig = {
    experimental: {
      cpus: 1,
      workerThreads: true,
    },
    output: "standalone",
  };
  ```

  توضیح:

  - `cpus: 1`: تعداد workerهای Next.js را محدود می‌کند تا مصرف CPU و تعداد processها کنترل شود.
  - `workerThreads: true`: به جای child processهای متعدد، از worker thread استفاده می‌شود.
  - `output: "standalone"`: خروجی مناسب برای Docker production ایجاد می‌کند. Dockerfile از خروجی `.next/standalone` استفاده می‌کند.

  ## tsconfig.json

  فایل `tsconfig.json` تنظیمات TypeScript را تعریف می‌کند.

  نکات مهم:

  - `strict: true`: تایپ‌چک سخت‌گیرانه فعال است.
  - `noEmit: true`: TypeScript فایل خروجی تولید نمی‌کند؛ Next.js خودش build را مدیریت می‌کند.
  - `moduleResolution: "bundler"`: مناسب پروژه‌های Next.js جدید.
  - `jsx: "react-jsx"`: JSX مدرن React.
  - `paths`: alias زیر را تعریف می‌کند:

  ```json
  "@/*": ["./*"]
  ```

  به همین دلیل importهایی مثل `@/lib/db` یا `@/components/ui/button` کار می‌کنند.

  ## postcss.config.mjs

  این فایل PostCSS را برای Tailwind CSS 4 تنظیم می‌کند:

  ```js
  const config = {
    plugins: {
      "@tailwindcss/postcss": {},
    },
  };
  ```

  ## components.json

  این فایل تنظیمات shadcn-style components را نگه می‌دارد.

  نکات مهم:

  - سبک UI: `new-york`
  - TypeScript فعال است.
  - CSS اصلی: `app/globals.css`
  - aliasها:
    - `@/components`
    - `@/components/ui`
    - `@/lib`
    - `@/lib/utils`
  - icon library: `lucide`

  ## app/layout.tsx

  این فایل Root Layout برنامه است.

  وظایف:

  - import کردن `globals.css`.
  - تعریف metadata عمومی برنامه.
  - ساختار HTML پایه شامل `<html lang="en">` و `<body>`.

  metadata:

  ```ts
  export const metadata: Metadata = {
    title: "Game Center",
    description: "Play Snake and Memory Match in a mobile-first browser game center.",
  };
  ```

  تمام صفحات داخل `{children}` این layout رندر می‌شوند.

  ## app/globals.css

  این فایل CSS سراسری برنامه است.

  وظایف:

  - import کردن Tailwind CSS:

  ```css
  @import "tailwindcss";
  ```

  - تعریف CSS variables برای تم تاریک برنامه:
    - `--background`
    - `--foreground`
    - `--card`
    - `--primary`
    - `--secondary`
    - `--muted`
    - `--destructive`
    - `--border`
    - `--ring`

  - map کردن متغیرها به theme داخلی Tailwind با `@theme inline`.
  - تعریف background کلی با radial gradient.
  - تنظیم font پیش‌فرض روی Arial/Helvetica.

  این فایل زبان بصری پروژه را تعیین می‌کند: پس‌زمینه تیره، کارت‌های slate، رنگ primary سبز، و افکت‌های gradient.

  ## app/page.tsx

  این صفحه Home یا صفحه ورود و انتخاب بازی است.

  ویژگی‌ها:

  - Client Component است و با `"use client"` شروع می‌شود.
  - username کاربر را دریافت می‌کند.
  - username کاربر را فقط در state صفحه نگه می‌دارد.
  - اگر کاربر login نکرده باشد، فرم ورود نمایش داده می‌شود.
  - اگر کاربر login کرده باشد، کارت‌های انتخاب بازی نمایش داده می‌شوند.

  stateهای اصلی:

  ```ts
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [username, setUsername] = useState("");
  ```

  توابع اصلی:

  - `login`: username را trim می‌کند، پروفایل می‌سازد و ذخیره می‌کند.
  - `logout`: پروفایل را پاک می‌کند و صفحه را به حالت ورود برمی‌گرداند.

  لیست بازی‌ها در آرایه `games` تعریف شده است:

  - Snake با مسیر `/snake`
  - Memory Match با مسیر `/memory`

  این صفحه از کامپوننت‌های `Button`, `Card`, `Input` و آیکن‌های `lucide-react` استفاده می‌کند.

  ## مدیریت پروفایل

  پروفایل کاربر دیگر در مرورگر ذخیره نمی‌شود. username پس از ورود فقط در state صفحه اصلی نگه داشته می‌شود و هنگام ورود به بازی‌ها از طریق query string به مسیر بازی ارسال می‌شود. رکوردها و تاریخچه امتیازها فقط از PostgreSQL خوانده و در PostgreSQL ذخیره می‌شوند.

  ## app/memory/page.tsx

  این فایل صفحه و منطق کامل بازی Memory Match را پیاده‌سازی می‌کند.

  ### ساختار داده‌ها

  کارت Memory:

  ```ts
  type MemoryCard = {
    id: string;
    symbol: string;
    matched: boolean;
  };
  ```

  امتیاز Memory:

  ```ts
  type MemoryScore = {
    username: string;
    score: number;
    moves: number;
    seconds: number;
    playedAt: string;
  };
  ```

  نمادهای کارت‌ها:

  ```ts
  const SYMBOLS = ["A", "B", "C", "D", "E", "F", "G", "H"];
  ```

  هر symbol دو کارت تولید می‌کند، پس deck شامل ۱۶ کارت است.

  ### ساخت Deck

  تابع `createDeck` برای هر symbol دو کارت ایجاد می‌کند و سپس با `shuffle` ترتیب را تصادفی می‌کند.

  ```ts
  function createDeck(): MemoryCard[]
  ```

  ### محاسبه امتیاز

  فرمول امتیاز:

  ```ts
  Math.max(0, 10000 - moves * 100 - seconds * 10)
  ```

  یعنی حرکت کمتر و زمان کمتر امتیاز بیشتری می‌دهد.

  ### ارتباط با API

  خواندن Leaderboard:

  ```ts
  GET /api/memory-scores?username={username}
  ```

  ذخیره امتیاز:

  ```ts
  POST /api/memory-scores
  ```

  Body:

  ```json
  {
    "username": "player",
    "moves": 12,
    "seconds": 45
  }
  ```

  ### stateهای اصلی Memory

  - `profile`: کاربر فعلی.
  - `cards`: کارت‌های بازی.
  - `selectedIds`: کارت‌های انتخاب‌شده فعلی.
  - `moves`: تعداد حرکت‌ها.
  - `seconds`: تایمر بازی.
  - `hasStarted`: شروع شدن بازی.
  - `scores`: Top Players.
  - `playerBestScore`: بهترین امتیاز کاربر فعلی.
  - `isChecking`: جلوگیری از کلیک همزمان هنگام بررسی دو کارت.

  ### جریان بازی Memory

  1. صفحه username را از query string می‌خواند.
  2. Leaderboard و بهترین رکورد کاربر را از PostgreSQL API می‌گیرد.
  3. اگر API یا دیتابیس در دسترس نباشد، خطای اتصال نمایش داده می‌شود.
  4. با اولین انتخاب کارت، تایمر شروع می‌شود.
  5. وقتی دو کارت انتخاب شد، تعداد moves افزایش می‌یابد.
  6. اگر symbol دو کارت برابر باشد، هر دو matched می‌شوند.
  7. وقتی همه کارت‌ها matched شدند، امتیاز ذخیره می‌شود.
  8. POST به API ارسال می‌شود.
  9. بعد از ذخیره در دیتابیس، Leaderboard دوباره از سرور خوانده می‌شود.

  ### UI صفحه Memory

  صفحه شامل دو بخش اصلی است:

  - بخش بازی: کارت‌ها، moves، زمان، تعداد pairها، reset.
  - sidebar: بهترین نتیجه کاربر و Top Players.

  اگر کاربر login نکرده باشد، صفحه پیام `Login required` نمایش می‌دهد و لینک برگشت به صفحه اصلی می‌دهد.

  ## app/snake/page.tsx

  این فایل صفحه و منطق کامل بازی Snake را پیاده‌سازی می‌کند.

  ### ساختار داده‌ها

  نقطه روی Board:

  ```ts
  type Point = { x: number; y: number };
  ```

  جهت حرکت:

  ```ts
  type Direction = "up" | "down" | "left" | "right";
  ```

  امتیازهای اخیر local پروفایل:

  ```ts
  type ScoreEntry = { score: number; dots: number; playedAt: string };
  ```

  پروفایل Snake:

  ```ts
  type Profile = {
    username: string;
    bestScore: number;
    totalPoints: number;
    gamesPlayed: number;
    scores: ScoreEntry[];
  };
  ```

  ### ثابت‌های بازی

  ```ts
  const BOARD_SIZE = 18;
  const GAME = "snake";
  const POINTS_PER_DOT = 10;
  ```

  Board بازی ۱۸ در ۱۸ است. هر dot خورده‌شده ۱۰ امتیاز دارد.

  Snake اولیه:

  ```ts
  const START_SNAKE = [
    { x: 8, y: 9 },
    { x: 7, y: 9 },
    { x: 6, y: 9 },
  ];
  ```

  Dot اولیه:

  ```ts
  const START_DOT = { x: 12, y: 9 };
  ```

  ### کنترل‌ها

  کلیدهای پشتیبانی‌شده:

  - Arrow keys
  - WASD
  - Enter برای شروع یا شروع بازی جدید بعد از Game Over
  - دکمه‌های موبایل برای جهت‌ها

  تابع `isTextInputTarget` باعث می‌شود فشردن کلیدها داخل inputها بازی را کنترل نکند.

  ### تولید Dot جدید

  تابع `createDot` تمام خانه‌های خالی board را پیدا می‌کند و یک خانه تصادفی انتخاب می‌کند. Dot جدید روی بدن Snake قرار نمی‌گیرد.

  ### پروفایل Snake

  پروفایل Snake شامل best score، total points، games played و recent scores از API و جدول PostgreSQL `game_scores` محاسبه می‌شود.

  ### ارتباط با API

  خواندن Leaderboard:

  ```txt
  GET /api/snake-scores?username={username}
  ```

  ذخیره امتیاز:

  ```txt
  POST /api/snake-scores
  ```

  Body:

  ```json
  {
    "username": "player",
    "score": 120,
    "dots": 12
  }
  ```

  ### stateهای اصلی Snake

  - `profile`: پروفایل Snake کاربر.
  - `snake`: آرایه نقاط بدن Snake.
  - `dot`: موقعیت dot فعلی.
  - `direction`: جهت فعلی حرکت.
  - `nextDirection`: جهت بعدی برای جلوگیری از برگشت غیرمجاز.
  - `isPlaying`: وضعیت اجرای بازی.
  - `isGameOver`: وضعیت پایان بازی.
  - `dots`: تعداد dotهای خورده‌شده.
  - `topScores`: لیست Top Players.

  ### جریان بازی Snake

  1. صفحه username را از query string می‌خواند.
  2. امتیازها، recent scores و آمار پروفایل را از `/api/snake-scores` می‌گیرد.
  3. اگر API یا دیتابیس در دسترس نباشد، خطای اتصال نمایش داده می‌شود.
  4. وقتی بازی شروع شود، `setInterval` هر ۱۳۰ میلی‌ثانیه Snake را حرکت می‌دهد.
  5. برخورد با دیوار یا بدن خود Snake باعث Game Over می‌شود.
  6. خوردن dot باعث افزایش `dots` و تولید dot جدید می‌شود.
  7. بعد از Game Over امتیاز محاسبه می‌شود.
  8. امتیاز به API ارسال می‌شود.
  9. Leaderboard از دیتابیس دوباره خوانده می‌شود.

  ### UI صفحه Snake

  صفحه Snake شامل:

  - Header با نام کاربر و وضعیت بازی.
  - Board مربعی بازی.
  - دکمه‌های موبایل برای جهت‌ها.
  - Card پروفایل شامل best score، total points، games played.
  - Card Recent Scores.
  - Card Top Players.

  اگر کاربر login نکرده باشد، پیام `Login required` نمایش داده می‌شود.

  ## ذخیره‌سازی امتیازها

  ذخیره‌سازی محلی حذف شده است و رکوردها فقط از APIهای PostgreSQL خوانده و نوشته می‌شوند.

  رفتار ranking:

  - برای هر username فقط بهترین رکورد نمایش داده می‌شود.
  - مرتب‌سازی اول بر اساس score بیشتر است.
  - برای Memory در score برابر، seconds کمتر و moves کمتر بهتر است.
  - خروجی فقط ۱۰ رکورد اول است.
  - رکوردهای خام در جدول PostgreSQL `game_scores` نگه داشته می‌شوند.

  ## lib/db.ts

  این فایل اتصال PostgreSQL را مدیریت می‌کند.

  کتابخانه استفاده‌شده:

  ```ts
  import { Pool } from "pg";
  ```

  تابع اصلی:

  ```ts
  export function getPool()
  ```

  رفتار:

  - اگر `DATABASE_URL` یا مجموعه کامل متغیرهای `POSTGRES_*` وجود نداشته باشد، خطا می‌دهد.
  - اگر Pool قبلا ساخته شده باشد، همان Pool را برمی‌گرداند.
  - اگر `DATABASE_URL` وجود داشته باشد، Pool با connection string ساخته می‌شود؛ در غیر این صورت از host، port، database، user و password جداگانه استفاده می‌شود.

  علت استفاده از `globalThis`:

  در محیط Next.js و hot reload، ممکن است ماژول‌ها چند بار reload شوند. ذخیره Pool روی `globalThis` مانع ایجاد connection poolهای اضافی می‌شود.

  ## app/api/memory-scores/route.ts

  این فایل Route Handler مربوط به امتیازهای Memory است.

  Runtime:

  ```ts
  export const runtime = "nodejs";
  ```

  چون از PostgreSQL و package `pg` استفاده می‌شود، runtime باید Node.js باشد.

  ### ensureScoresTable

  این تابع جدول `game_scores` و index لازم را ایجاد می‌کند. همچنین ستون `dots` را برای سازگاری با Snake اضافه می‌کند.

  ### GET

  ورودی:

  ```txt
  /api/memory-scores?username=player
  ```

  عملکرد:

  - جدول را ایجاد یا migrate می‌کند.
  - Top score هر username را از دیتابیس می‌خواند.
  - بهترین رکورد کاربر فعلی را جداگانه می‌خواند.
  - خروجی را بر اساس score، seconds و moves مرتب می‌کند.
  - فقط ۱۰ رکورد اول را برمی‌گرداند.

  ### POST

  Body:

  ```json
  {
    "username": "player",
    "moves": 12,
    "seconds": 45
  }
  ```

  Validation:

  - username باید string و غیرخالی باشد.
  - moves باید عدد و حداقل ۱ باشد.
  - seconds باید عدد و حداقل ۰ باشد.
  - username به ۴۰ کاراکتر محدود می‌شود.

  بعد از validation، score محاسبه و در جدول ذخیره می‌شود.

  ## app/api/snake-scores/route.ts

  این فایل Route Handler مربوط به امتیازهای Snake است.

  Runtime:

  ```ts
  export const runtime = "nodejs";
  ```

  ### GET

  ورودی:

  ```txt
  /api/snake-scores?username=player
  ```

  عملکرد:

  - جدول `game_scores` را ایجاد یا migrate می‌کند.
  - بهترین score هر username برای بازی Snake را می‌خواند.
  - بهترین رکورد کاربر فعلی را برمی‌گرداند.
  - خروجی را بر اساس score بیشتر و dots بیشتر مرتب می‌کند.

  ### POST

  Body:

  ```json
  {
    "username": "player",
    "score": 120,
    "dots": 12
  }
  ```

  Validation:

  - username باید string و غیرخالی باشد.
  - score باید عدد و حداقل ۰ باشد.
  - dots باید عدد و حداقل ۰ باشد.

  رکورد با `game = "snake"` در جدول `game_scores` ذخیره می‌شود.

  ## دیتابیس PostgreSQL

  نام دیتابیس:

  ```txt
  game_center
  ```

  نام کاربر:

  ```txt
  postgres
  ```

  رمز عبور:

  ```txt
  مقدار `POSTGRES_PASSWORD` در فایل `.env`
  ```

  نام جدول اصلی:

  ```txt
  game_scores
  ```

  Schema جدول:

  ```sql
  CREATE TABLE IF NOT EXISTS game_scores (
    id BIGSERIAL PRIMARY KEY,
    game TEXT NOT NULL,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    moves INTEGER,
    seconds INTEGER,
    dots INTEGER,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```

  معنی ستون‌ها:

  - `id`: شناسه داخلی رکورد.
  - `game`: نام بازی، مثل `memory-match` یا `snake`.
  - `username`: نام بازیکن.
  - `score`: امتیاز نهایی.
  - `moves`: تعداد حرکت در Memory.
  - `seconds`: زمان بازی Memory.
  - `dots`: تعداد dotهای خورده‌شده در Snake.
  - `played_at`: زمان ثبت رکورد.

  ## components/ui/button.tsx

  این فایل کامپوننت Button عمومی پروژه است.

  ویژگی‌ها:

  - با `React.forwardRef` ساخته شده.
  - از `class-variance-authority` برای variant و size استفاده می‌کند.
  - از `Slot` برای قابلیت `asChild` استفاده می‌کند.

  Variantها:

  - `default`
  - `destructive`
  - `outline`
  - `secondary`
  - `ghost`

  Sizeها:

  - `default`
  - `sm`
  - `lg`
  - `icon`

  مثال کاربرد:

  ```tsx
  <Button variant="secondary" size="sm">New game</Button>
  ```

  یا با لینک Next.js:

  ```tsx
  <Button asChild>
    <Link href="/snake">Play</Link>
  </Button>
  ```

  ## components/ui/card.tsx

  این فایل کامپوننت‌های Card را تعریف می‌کند:

  - `Card`
  - `CardHeader`
  - `CardTitle`
  - `CardDescription`
  - `CardContent`

  همه با `React.forwardRef` ساخته شده‌اند و از `cn` برای ترکیب classNameها استفاده می‌کنند.

  این کامپوننت‌ها در صفحه Home، Snake و Memory برای ساخت پنل‌ها، leaderboard و وضعیت بازی استفاده شده‌اند.

  ## components/ui/input.tsx

  این فایل کامپوننت Input عمومی پروژه است.

  ویژگی‌ها:

  - پشتیبانی از ref.
  - کلاس‌های Tailwind برای border، focus ring، disabled state و placeholder.
  - در صفحه Home برای دریافت username استفاده می‌شود.

  ## lib/utils.ts

  این فایل helper عمومی `cn` را تعریف می‌کند:

  ```ts
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```

  کاربرد:

  - `clsx` کلاس‌ها را شرطی ترکیب می‌کند.
  - `tailwind-merge` conflictهای Tailwind را حذف می‌کند.

  مثلا اگر دو کلاس `px-2` و `px-4` همزمان باشند، خروجی نهایی conflict نخواهد داشت.

  ## Dockerfile

  این فایل Image production برنامه را می‌سازد.

  Stageها:

  ### dependencies

  - base image: `node:24.14.0-slim`
  - `package.json` و `package-lock.json` کپی می‌شوند.
  - `npm ci --no-audit --no-fund` اجرا می‌شود.

  ### builder

  - `node_modules` از stage قبلی کپی می‌شود.
  - سورس پروژه کپی می‌شود.
  - `npm run build` اجرا می‌شود.

  ### runner

  - فقط خروجی production لازم کپی می‌شود.
  - از `.next/standalone` و `.next/static` استفاده می‌شود.
  - برنامه با کاربر `node` اجرا می‌شود.
  - پورت `3000` expose می‌شود.
  - دستور اجرا:

  ```dockerfile
  CMD ["node", "server.js"]
  ```

  ## Dockerfile.dev

  این فایل برای محیط توسعه داخل Docker است.

  ویژگی‌ها:

  - dependencyها با `npm ci` نصب می‌شوند.
  - کل پروژه کپی می‌شود.
  - `WATCHPACK_POLLING=true` تنظیم شده تا file watching در Docker بهتر کار کند.
  - برنامه با `npm run dev` اجرا می‌شود.

  در حال حاضر `compose.yaml` از Dockerfile production استفاده می‌کند، نه Dockerfile.dev.

  ## compose.yaml

  این فایل دو سرویس اصلی تعریف می‌کند:

  ### app

  - از Dockerfile محلی build می‌شود.
  - image محلی: `game-center:local`
  - environment:

  ```txt
  POSTGRES_HOST=10.0.0.4
  POSTGRES_PORT=5432
  POSTGRES_DB=game_center
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=YOUR_PASSWORD
  ```

  - پورت:

  ```txt
  8094:3000
  ```

  یعنی از سیستم میزبان برنامه روی آدرس زیر باز می‌شود:

  ```txt
  http://localhost:8094
  ```

  ### db

  - image: `postgres:17-alpine`
  - database: `game_center`
  - user: `postgres`
  - password: مقدار `POSTGRES_PASSWORD` در فایل `.env`
  - volume دائمی: `postgres-data`
  - پورت:

  ```txt
  5432:5432
  ```

  یعنی pgAdmin باید به `localhost:5432` وصل شود.

  ## .env.example

  این فایل نمونه متغیر محیطی دیتابیس را نشان می‌دهد:

  ```txt
  PRIVATE_IP=10.0.0.4
  POSTGRES_HOST=10.0.0.4
  POSTGRES_PORT=5432
  POSTGRES_DB=game_center
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=YOUR_PASSWORD
  ```

  نکته عملی:

  مقدار واقعی متغیرها در فایل `.env` نگه‌داری می‌شود و در git commit نمی‌شود. در GitHub Actions همین نام‌ها به عنوان Secrets تنظیم می‌شوند.

  ## .dockerignore

  این فایل تعیین می‌کند چه چیزهایی وارد Docker build context نشوند.

  موارد مهم ignore شده:

  - `node_modules/`
  - `.next/`
  - `out/`, `dist/`, `build/`
  - فایل‌های `.env`
  - logها
  - فایل‌های IDE
  - `.git/`
  - Docker metadata
  - `*.tsbuildinfo`

  این کار build image را سریع‌تر، سبک‌تر و امن‌تر می‌کند.

  ## .gitignore

  این فایل تعیین می‌کند Git چه فایل‌هایی را track نکند.

  موارد مهم:

  - `node_modules/`
  - `.next/`
  - خروجی build
  - `.env*` به جز `.env.example`
  - logها
  - فایل‌های سیستم‌عامل و IDE
  - `next-env.d.ts`

  ## .github/workflows/deploy.yml

  این فایل GitHub Actions برای Build و Deploy است.

  Triggerها:

  - push روی branch `main`
  - اجرای دستی با `workflow_dispatch`

  Job اول: `build-and-push`

  - checkout کد.
  - setup Docker Buildx.
  - login به GHCR.
  - build و push image با tagهای:
    - `latest`
    - commit SHA

  Job دوم: `deploy`

  - با SSH به VPS وصل می‌شود.
  - پوشه `$HOME/game-center` را آماده می‌کند.
  - یک `compose.yaml` روی VPS تولید می‌کند.
  - image جدید را pull می‌کند.
  - `docker compose up -d --remove-orphans` اجرا می‌کند.
  - imageهای اضافی را prune می‌کند.

  نکته مهم:

  workflow فقط سرویس `app` را روی VPS می‌نویسد و اتصال PostgreSQL را از Secrets با نام‌های `POSTGRES_HOST`، `POSTGRES_PORT`، `POSTGRES_USER` و `POSTGRES_PASSWORD` در فایل `.env` قرار می‌دهد. سرویس `db` داخل compose تولیدشده روی VPS تعریف نمی‌شود.

  ## public/.gitkeep

  پوشه `public` برای فایل‌های static استفاده می‌شود. در حال حاضر فایل واقعی static وجود ندارد و `.gitkeep` فقط برای نگه داشتن پوشه در Git است.

  ## LICENSE

  پروژه تحت License نوع MIT است.

  معنی عملی:

  - استفاده، تغییر، انتشار و توزیع کد مجاز است.
  - نرم‌افزار بدون warranty ارائه می‌شود.

  ## جریان کامل اجرای برنامه

  1. کاربر وارد `/` می‌شود.
  2. فرم ورود نمایش داده می‌شود.
  3. بعد از ورود، username فقط در state صفحه نگه داشته می‌شود.
  4. کاربر یکی از بازی‌ها را انتخاب می‌کند و username در query string به صفحه بازی ارسال می‌شود.
  5. صفحه بازی leaderboard و رکوردهای کاربر را از API می‌خواند.
  6. بعد از پایان بازی، امتیاز به API ارسال می‌شود.
  7. API امتیاز را در PostgreSQL ذخیره می‌کند.
  8. UI دوباره leaderboard را از سرور می‌خواند.

  ## دستورات مهم توسعه

  نصب dependencyها:

  ```bash
  npm install
  ```

  اجرای local dev:

  ```bash
  npm run dev
  ```

  Build production:

  ```bash
  npm run build
  ```

  اجرای Docker با build local:

  ```bash
  docker compose up -d --build
  ```

  مشاهده وضعیت containerها:

  ```bash
  docker compose ps
  ```

  دیدن logها:

  ```bash
  docker compose logs -f
  ```

  توقف سرویس‌ها:

  ```bash
  docker compose down
  ```

  ## اتصال pgAdmin

  برای pgAdmin از این مقادیر استفاده شود:

  ```txt
  Host name/address: 10.0.0.4
  Port: 5432
  Maintenance database: game_center
  Username: postgres
  Password: مقدار `POSTGRES_PASSWORD` در فایل `.env`
  ```

  اگر به جای `5433` از `5432` استفاده شود، ممکن است به PostgreSQL دیگری روی سیستم وصل شوید و خطای password authentication بگیرید.

  ## تست‌های انجام‌شده

  Build پروژه موفق بوده است:

  ```txt
  npm run build
  ```

  خروجی routeها شامل موارد زیر بوده است:

  ```txt
  /api/memory-scores
  /api/snake-scores
  /memory
  /snake
  ```

  Docker Compose با موفقیت اجرا شد:

  ```txt
  game-center-app-1   running   0.0.0.0:8094->3000/tcp
  game-center-db-1    running   0.0.0.0:5433->5432/tcp
  ```

  اتصال دیتابیس تست شد:

  ```sql
  SELECT current_database(), current_user;
  ```

  خروجی:

  ```txt
  game_center | postgres
  ```

  ثبت امتیاز Memory تست شد:

  ```json
  {
    "username": "test-memory",
    "score": 8350,
    "moves": 12,
    "seconds": 45
  }
  ```

  ثبت امتیاز Snake تست شد:

  ```json
  {
    "username": "test-snake",
    "score": 120,
    "dots": 12
  }
  ```

  Query نهایی روی جدول `game_scores` رکوردهای هر دو بازی را نشان داد.

  ## نکات فنی و ریسک‌ها

  - برای APIهای دیتابیس باید `DATABASE_URL` یا متغیرهای `POSTGRES_HOST`، `POSTGRES_PORT`، `POSTGRES_DB`، `POSTGRES_USER` و `POSTGRES_PASSWORD` تنظیم شود.
  - ذخیره‌سازی LocalStorage حذف شده است؛ leaderboard و تاریخچه امتیازها به PostgreSQL وابسته‌اند.
  - جدول `game_scores` برای هر دو بازی مشترک است؛ نوع بازی با ستون `game` تفکیک می‌شود.
  - workflow تولیدی GitHub Actions دیتابیس را روی VPS تعریف نمی‌کند و به یک PostgreSQL در `10.0.0.4:5432` متصل می‌شود.
  - `.env` و GitHub Secrets نباید commit یا در logهای workflow چاپ شوند.

  ## جمع‌بندی

  این پروژه یک Game Center کوچک اما کامل است که شامل UI بازی‌ها، مدیریت پروفایل، امتیازدهی، leaderboard، APIهای Next.js، PostgreSQL، و Docker production build است. معماری فعلی برای رکوردها و leaderboard به PostgreSQL وابسته است.

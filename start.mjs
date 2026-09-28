// Dedicated, unconditional entry point for a process manager (pm2 etc).
// server.mjs's own `if (process.argv[1] === fileURLToPath(import.meta.url))`
// self-check (for a plain `node server.mjs`) does not reliably match how
// pm2 invokes a script — observed for real: pm2 reported the process
// "online" with zero restarts, but nothing was ever logged and nothing
// was listening on the port, because that check silently failed and the
// whole startup block never ran. This file has no such check — it always
// starts the server, the only thing it exists to do.
import { createShopLite } from "./server.mjs";

const port = Number(process.argv[2] ?? process.env.PORT ?? 4400);
createShopLite().listen(port, () => console.log(`ShopLite (seeded-bug benchmark app) on http://localhost:${port}`));
// test comment Mon Sep 28 09:44:02 AM UTC 2026
// verify Mon Sep 28 09:57:45 AM UTC 2026

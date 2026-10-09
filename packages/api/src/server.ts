import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadStoreData } from "./data.js";
import { createStore } from "./store.js";

const port = Number(process.env.PORT ?? 8787);
const app = createApp({ store: createStore(loadStoreData()) });

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`Urlaubsverwaltung API laeuft auf http://localhost:${info.port}\n`);
});

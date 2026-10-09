import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { createHttpClient } from "./api-client.js";
import "./styles.css";

const container = document.querySelector("#root");
if (!container) {
  throw new Error("Kein Wurzelelement mit der Id root gefunden.");
}

createRoot(container).render(
  <StrictMode>
    <App client={createHttpClient()} />
  </StrictMode>,
);

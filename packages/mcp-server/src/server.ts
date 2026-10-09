import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HrStore } from "./store.js";
import {
  getEmployee,
  holidaysFor,
  listAbsences,
  listEmployees,
  requestLeave,
  ToolError,
} from "./tools.js";

const store = new HrStore();

const server = new McpServer({
  name: "urlaub-hr",
  version: "1.0.0",
});

/** Ergebnisse gehen als formatiertes JSON zurueck, Fehler als Klartext. */
function ok(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, undefined, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof ToolError ? error.message : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

server.registerTool(
  "get_employee",
  {
    title: "Mitarbeiter abrufen",
    description: [
      "Liefert den vollstaendigen Stammdatensatz eines Mitarbeiters: Name, Team, Bundesland,",
      "vertragliche Arbeitstage, Jahresanspruch bei Vollzeit, Eintrittsdatum und Resturlaub",
      "aus dem Vorjahr.",
      "",
      "Nutze dieses Tool, wenn du zu einer bekannten Id rechnen willst, etwa um Arbeitstage",
      "oder Anspruch zu bestimmen.",
      "",
      "Es liefert weder Abwesenheiten noch einen Kontostand. Abwesenheiten kommen aus",
      "list_absences. Wenn du die Id nicht kennst, nimm zuerst list_employees.",
      "",
      'Beispiel: id = "emp-003".',
    ].join("\n"),
    inputSchema: {
      id: z.string().describe('Id des Mitarbeiters, Format "emp-NNN", zum Beispiel "emp-003".'),
    },
  },
  ({ id }) => {
    try {
      return ok(getEmployee(store, id));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "list_employees",
  {
    title: "Mitarbeiter auflisten",
    description: [
      "Liefert alle Mitarbeiter, optional auf ein Team eingeschraenkt. Der Datensatz je Person",
      "ist derselbe wie bei get_employee.",
      "",
      "Nutze dieses Tool, um Ids zu finden, Teams zu ueberblicken oder zu pruefen, wer",
      "ueberhaupt existiert.",
      "",
      "Es ist keine Suche: Der Teamname muss exakt stimmen, Teilstrings finden nichts.",
      "Ohne Argument kommt die vollstaendige Liste, das sind derzeit zwoelf Personen.",
      "",
      'Beispiel: team = "Plattform".',
    ].join("\n"),
    inputSchema: {
      team: z
        .string()
        .optional()
        .describe(
          'Exakter Teamname. Vorhanden sind "Plattform", "Kundenportal" und "Datenintegration".',
        ),
    },
  },
  ({ team }) => {
    try {
      return ok(listEmployees(store, team));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "list_absences",
  {
    title: "Genehmigte Abwesenheiten eines Teams",
    description: [
      "Liefert alle bereits genehmigten Abwesenheiten eines Teams, die sich mit dem",
      "angefragten Zeitraum ueberschneiden. Ein Eintrag nennt Id und Name der Person sowie",
      "Beginn und Ende.",
      "",
      "Nutze dieses Tool, bevor du einen neuen Antrag stellst oder bewertest, ob ein Team an",
      "einem Tag noch besetzt waere.",
      "",
      "Offene, abgelehnte und stornierte Antraege sind nicht enthalten, nur genehmigte.",
      "Feiertage und vertragsfreie Tage stehen hier nicht; dafuer gibt es get_holidays und",
      "die Arbeitstage aus get_employee.",
      "",
      'Beispiel: team = "Plattform", from = "2026-07-01", to = "2026-07-31".',
    ].join("\n"),
    inputSchema: {
      team: z.string().describe('Exakter Teamname, zum Beispiel "Plattform".'),
      from: z
        .string()
        .describe('Erster Tag des Zeitraums als ISO-Datum, zum Beispiel "2026-07-01".'),
      to: z
        .string()
        .describe('Letzter Tag des Zeitraums als ISO-Datum, zum Beispiel "2026-07-31".'),
    },
  },
  ({ team, from, to }) => {
    try {
      return ok(listAbsences(store, team, from, to));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "get_holidays",
  {
    title: "Gesetzliche Feiertage",
    description: [
      "Liefert alle gesetzlichen Feiertage eines Bundeslandes in einem Kalenderjahr, nach",
      "Datum sortiert. Je Eintrag Datum, Name und ob der Tag bundesweit gilt.",
      "",
      "Nutze dieses Tool, wenn du Urlaubstage zaehlst: Ein Feiertag im Bundesland des",
      "Mitarbeiters verbraucht keinen Urlaub.",
      "",
      "Es kennt keine Brueckentage, keine betrieblichen Schliesstage und keine regionalen",
      "Sonderfaelle innerhalb eines Landes. Das Bundesland eines Mitarbeiters steht in",
      "get_employee.",
      "",
      'Beispiel: bundesland = "NW", year = 2026.',
    ].join("\n"),
    inputSchema: {
      bundesland: z
        .string()
        .describe(
          "Kuerzel des Bundeslandes: BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH oder TH.",
        ),
      year: z.number().int().describe("Kalenderjahr zwischen 2020 und 2040, zum Beispiel 2026."),
    },
  },
  ({ bundesland, year }) => {
    try {
      return ok(holidaysFor(bundesland, year));
    } catch (error) {
      return fail(error);
    }
  },
);

server.registerTool(
  "request_leave",
  {
    title: "Urlaubsantrag anlegen",
    description: [
      "SCHREIBENDES TOOL. Legt einen neuen Urlaubsantrag an und speichert ihn dauerhaft in",
      "data/absences.json. Das ist das einzige Tool dieses Servers, das Daten veraendert.",
      "Frag vorher nach, wenn der Auftrag nicht eindeutig war.",
      "",
      "Der Antrag wird vor dem Speichern gegen alle Fachregeln geprueft: Arbeitstage,",
      "Feiertage, Rueckwirkung von hoechstens 14 Tagen, kein Zeitraum ueber den Jahreswechsel,",
      "ausreichender Restanspruch. Verletzt er eine Regel, wird nichts geschrieben und du",
      "bekommst den Grund als Fehlertext.",
      "",
      'Der Antrag entsteht im Status "pending". Genehmigen und Stornieren kann dieser Server',
      "nicht.",
      "",
      'Beispiel: employeeId = "emp-003", from = "2026-07-06", to = "2026-07-10".',
    ].join("\n"),
    inputSchema: {
      employeeId: z.string().describe('Id des Mitarbeiters, zum Beispiel "emp-003".'),
      from: z.string().describe('Erster Urlaubstag als ISO-Datum, zum Beispiel "2026-07-06".'),
      to: z
        .string()
        .describe('Letzter Urlaubstag als ISO-Datum. Bei einem einzelnen Tag gleich "from".'),
      halfDay: z
        .enum(["AM", "PM"])
        .optional()
        .describe(
          'Halber Tag: "AM" fuer vormittags, "PM" fuer nachmittags. Nur zulaessig, wenn "from" und "to" derselbe Tag sind.',
        ),
    },
  },
  ({ employeeId, from, to, halfDay }) => {
    try {
      return ok(requestLeave(store, { employeeId, from, to, halfDay }));
    } catch (error) {
      return fail(error);
    }
  },
);

await server.connect(new StdioServerTransport());

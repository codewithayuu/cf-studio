import { openDB, type IDBPDatabase } from "idb";
import type {
  Problem,
  TestCase,
  Note,
  SubmissionRecord,
  Template,
} from "@cf-studio/shared";

const DB_NAME = "cf-studio-db";
const DB_VERSION = 2;

interface CFStudioDBSchema {
  problems: Problem;
  testCases: TestCase;
  notes: Note;
  templates: Template;
  submissions: SubmissionRecord;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("problems")) {
          db.createObjectStore("problems", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("testCases")) {
          const store = db.createObjectStore("testCases", {
            keyPath: ["problemId", "input", "source"],
          });
          store.createIndex("byProblem", "problemId");
        }
        if (!db.objectStoreNames.contains("notes")) {
          const store = db.createObjectStore("notes", { keyPath: "id" });
          store.createIndex("byProblem", "problemId");
          store.createIndex("byUpdatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("templates")) {
          const store = db.createObjectStore("templates", { keyPath: "id" });
          store.createIndex("byUpdatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("submissions")) {
          const store = db.createObjectStore("submissions", {
            keyPath: ["problemId", "submittedAt"],
          });
          store.createIndex("byProblem", "problemId");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProblemData(problem: Problem, testCases: TestCase[]) {
  const db = await getDB();
  const tx = db.transaction(["problems", "testCases"], "readwrite");

  await tx.objectStore("problems").put(problem);

  const tcStore = tx.objectStore("testCases");
  const existingCases = await tcStore.index("byProblem").getAll(problem.id);
  await Promise.all(
    existingCases
      .filter((tc: any) => tc.source === "sample")
      .map((tc: any) => tcStore.delete([tc.problemId, tc.input, tc.source])),
  );

  await Promise.all(testCases.map((tc) => tcStore.put(tc)));

  await tx.done;
}

export async function getProblemData(contestId: number, index: string) {
  const db = await getDB();
  const problemId = `${contestId}-${index}`;

  const problem = await db.get("problems", problemId);
  if (!problem) return null;

  const testCases = await db.getAllFromIndex(
    "testCases",
    "byProblem",
    problemId,
  );
  return { problem: problem as Problem, testCases: testCases as TestCase[] };
}

export async function getNotes(problemId: string): Promise<Note[]> {
  const db = await getDB();
  return (await db.getAllFromIndex("notes", "byProblem", problemId)) as Note[];
}

export async function saveNote(note: Note) {
  const db = await getDB();
  await db.put("notes", { ...note, updatedAt: Date.now() });
}

export async function deleteNote(id: string) {
  const db = await getDB();
  await db.delete("notes", id);
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  return (await db.getAll("notes")) as Note[];
}

export async function getTemplates(): Promise<Template[]> {
  const db = await getDB();
  return (await db.getAll("templates")) as Template[];
}

export async function saveTemplate(template: Template) {
  const db = await getDB();
  await db.put("templates", { ...template, updatedAt: Date.now() });
}

export async function deleteTemplate(id: string) {
  const db = await getDB();
  await db.delete("templates", id);
}

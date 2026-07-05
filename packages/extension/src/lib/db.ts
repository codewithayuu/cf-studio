import { openDB, type IDBPDatabase } from "idb";
import type {
  Problem,
  TestCase,
  Note,
  SubmissionRecord,
} from "@cf-studio/shared";

const DB_NAME = "cf-studio-db";
const DB_VERSION = 1;

interface CFStudioDBSchema {
  problems: Problem;
  testCases: TestCase;
  notes: Note;
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

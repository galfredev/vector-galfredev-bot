import { readFile } from "node:fs/promises";

function readFromStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required string: ${label}`);
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be a JSON object.");
  }

  const normalized = payload.normalized;
  if (!normalized || typeof normalized !== "object") {
    throw new Error("Payload is missing normalized block.");
  }

  assertString(normalized.schemaVersion, "normalized.schemaVersion");
  assertString(normalized.source?.channel, "normalized.source.channel");
  assertString(normalized.source?.occurredAt, "normalized.source.occurredAt");
  assertString(normalized.person?.name, "normalized.person.name");
  assertString(normalized.company?.displayName, "normalized.company.displayName");
  assertString(normalized.opportunity?.title, "normalized.opportunity.title");
  assertString(normalized.opportunity?.stage, "normalized.opportunity.stage");
  assertString(normalized.opportunity?.status, "normalized.opportunity.status");
  assertString(normalized.note?.title, "normalized.note.title");
  assertString(normalized.note?.body, "normalized.note.body");

  if (!Array.isArray(normalized.attachments)) {
    throw new Error("normalized.attachments must be an array.");
  }
}

async function main() {
  const filePath = process.argv[2];
  const raw = filePath ? await readFile(filePath, "utf8") : await readFromStdin();
  const payload = JSON.parse(raw);
  validatePayload(payload);
  console.log("crm-payload-ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

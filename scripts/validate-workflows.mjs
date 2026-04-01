import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const workflowsDir = path.join(rootDir, "workflows", "n8n");

async function main() {
  const entries = await readdir(workflowsDir, { withFileTypes: true });
  const files = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".workflow.json"),
  );

  if (files.length === 0) {
    console.log("No canonical workflow files found.");
    return;
  }

  for (const file of files) {
    const fullPath = path.join(workflowsDir, file.name);
    const raw = await readFile(fullPath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Workflow ${file.name} is not a JSON object.`);
    }

    if (!Array.isArray(parsed.nodes)) {
      throw new Error(`Workflow ${file.name} is missing nodes[].`);
    }

    if (!parsed.connections || typeof parsed.connections !== "object") {
      throw new Error(`Workflow ${file.name} is missing connections.`);
    }

    console.log(`workflow-ok ${file.name}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

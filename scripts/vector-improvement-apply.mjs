#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  auditFile,
  currentIso,
  ensureManagedBlock,
  logAudit,
  pendingProposalFile,
  readJson,
  restartService,
  testCasesFile,
  workspaceDir,
  writeJson,
} from "./vector-improvement-lib.mjs";

const proposalPath = process.argv[2] || pendingProposalFile();
const proposal = readJson(proposalPath, null);

if (!proposal || proposal.status !== "pending") {
  console.error("No pending proposal to apply.");
  process.exit(1);
}

const agentsPath = path.join(workspaceDir(), "AGENTS.md");
const memoryPath = path.join(workspaceDir(), "MEMORY.md");

for (const action of proposal.actions || []) {
  if (action.type === "managed_block" && action.target === "agents") {
    ensureManagedBlock(agentsPath, action.slug, action.title, action.body);
  }

  if (action.type === "managed_block" && action.target === "memory") {
    ensureManagedBlock(memoryPath, action.slug, action.title, action.body);
  }

  if (action.type === "append_test_case") {
    ensureManagedBlock(testCasesFile(), action.slug, action.title, action.body);
  }
}

proposal.status = "applied";
proposal.appliedAt = currentIso();
writeJson(proposalPath, proposal);
logAudit("proposal.applied", { proposalId: proposal.id, auditFile: auditFile() });
restartService();

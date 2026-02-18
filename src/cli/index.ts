#!/usr/bin/env node

import { createCli, runCli } from "@b4r7/cli-core";
import { VERSION } from "./constants.js";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { listCommand } from "./commands/list.js";
import { diffCommand } from "./commands/diff.js";
import { removeCommand } from "./commands/remove.js";

const program = createCli({
  name: "keyscope",
  displayName: "KEYSCOPE",
  description: "Composable keyboard navigation hooks for React",
  version: VERSION,
  commands: [initCommand, addCommand, listCommand, diffCommand, removeCommand],
  menuItems: [
    { value: "init", label: "Init", hint: "Initialize keyscope in your project" },
    { value: "add", label: "Add", hint: "Add hooks to your project" },
    { value: "list", label: "List", hint: "List available hooks" },
    { value: "diff", label: "Diff", hint: "Compare local vs registry versions" },
    { value: "remove", label: "Remove", hint: "Remove installed hooks" },
  ],
});

runCli(program);

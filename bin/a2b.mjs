#!/usr/bin/env node

import fs from "node:fs/promises";
import {
  listMarketCategories,
  listMarketEntries,
  searchMarketEntries,
  showMarketEntry,
  updateMarketCache
} from "./lib/a2b-market.mjs";
import { createRelayServer } from "./lib/a2b-relay-server.mjs";
import { requestJson } from "./lib/a2b-http-client.mjs";
import { formatHelp } from "./lib/a2b-help.mjs";

function parseArgs(argv) {
  const args = [...argv];
  const flags = {
    port: 46321,
    token: process.env.A2B_TOKEN,
    json: false,
    path: undefined,
    timeoutMs: 5000
  };
  const positional = [];

  while (args.length > 0) {
    const value = args.shift();
    if (value === "--port") {
      flags.port = Number(args.shift() ?? "46321");
      continue;
    }
    if (value === "--token") {
      flags.token = args.shift();
      continue;
    }
    if (value === "--json") {
      flags.json = true;
      continue;
    }
    if (value === "--path") {
      flags.path = args.shift();
      continue;
    }
    if (value === "--timeout-ms") {
      flags.timeoutMs = Number(args.shift() ?? "5000");
      continue;
    }
    positional.push(value);
  }

  return { flags, positional };
}

function print(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (typeof value === "string") {
    console.log(value);
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const [command, ...rest] = positional;
const baseUrl = `http://127.0.0.1:${flags.port}`;

if (!command || command === "-h" || command === "--help" || command === "help") {
  print(formatHelp(), false);
  process.exit(0);
}

try {
  if (command === "serve") {
    const relay = await createRelayServer({
      port: flags.port,
      token: flags.token
    });
    print(
      {
        ok: true,
        baseUrl: relay.baseUrl,
        wsUrl: relay.wsUrl
      },
      flags.json
    );
    await new Promise(() => {});
  }

  if (command === "market") {
    const subcommand = rest[0];
    const subarg = rest[1];

    if (subcommand === "update") {
      print(await updateMarketCache(), flags.json);
      process.exit(0);
    }

    if (subcommand === "categories") {
      const result = await listMarketCategories();
      print(flags.json ? { categories: result } : result, flags.json);
      process.exit(0);
    }

    if (subcommand === "list") {
      if (!subarg) {
        throw new Error("market list requires a category");
      }
      const result = await listMarketEntries(undefined, subarg);
      print(flags.json ? { entries: result } : result, flags.json);
      process.exit(0);
    }

    if (subcommand === "show") {
      if (!subarg) {
        throw new Error("market show requires an entry");
      }
      print(await showMarketEntry(undefined, subarg), flags.json);
      process.exit(0);
    }

    if (subcommand === "search") {
      if (!subarg) {
        throw new Error("market search requires a keyword");
      }
      const result = await searchMarketEntries(undefined, subarg);
      print(flags.json ? { entries: result } : result, flags.json);
      process.exit(0);
    }

    throw new Error("market requires one of: update, categories, list, show, search");
  }

  if (command === "status") {
    print(await requestJson(baseUrl, flags.token, "GET", "/healthz"), flags.json);
    process.exit(0);
  }

  if (command === "tabs") {
    const result = await requestJson(baseUrl, flags.token, "GET", "/tabs");
    print(flags.json ? result : result.targets, flags.json);
    process.exit(0);
  }

  if (command === "new") {
    const url = rest[0] ?? "about:blank";
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/open", { url }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "select") {
    const target = rest[0];
    if (!target) {
      throw new Error("select requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/focus", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "goto") {
    const target = rest[0];
    const url = rest[1];
    if (!target || !url) {
      throw new Error("goto requires a target and url");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/goto", {
        target,
        url
      }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "reload") {
    const target = rest[0];
    if (!target) {
      throw new Error("reload requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/reload", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "back") {
    const target = rest[0];
    if (!target) {
      throw new Error("back requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/back", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "forward") {
    const target = rest[0];
    if (!target) {
      throw new Error("forward requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/forward", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "close") {
    const target = rest[0];
    if (!target) {
      throw new Error("close requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/tabs/close", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "cookies") {
    const target = rest[0];
    if (!target) {
      throw new Error("cookies requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/cookies", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "log") {
    const target = rest[0];
    if (!target) {
      throw new Error("log requires a target");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/recording", { target }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "screenshot") {
    const target = rest[0];
    if (!target) {
      throw new Error("screenshot requires a target");
    }
    const result = await requestJson(baseUrl, flags.token, "POST", "/screenshot", {
      target
    });
    if (flags.path && typeof result.data === "string") {
      await fs.writeFile(flags.path, Buffer.from(result.data, "base64"));
      print(
        flags.json
          ? { ...result, path: flags.path }
          : { ok: true, path: flags.path, format: result.format ?? "png" },
        flags.json
      );
      process.exit(0);
    }
    print(result, flags.json);
    process.exit(0);
  }

  if (command === "eval-js") {
    const target = rest[0];
    const expression = rest[1];
    if (!target || !expression) {
      throw new Error("eval-js requires a target and expression");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/eval", {
        target,
        expression
      }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "run-js") {
    const target = rest[0];
    const file = rest[1];
    if (!target || !file) {
      throw new Error("run-js requires a target and file");
    }
    const source = await fs.readFile(file, "utf8");
    print(
      await requestJson(baseUrl, flags.token, "POST", "/run-js", {
        target,
        source
      }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "click") {
    const target = rest[0];
    const selector = rest[1];
    if (!target || !selector) {
      throw new Error("click requires a target and selector");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/click", {
        target,
        selector
      }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "type") {
    const target = rest[0];
    const selector = rest[1];
    const text = rest[2];
    if (!target || !selector || text === undefined) {
      throw new Error("type requires a target, selector, and text");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/type", {
        target,
        selector,
        text
      }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "press") {
    const target = rest[0];
    const selector = rest[1];
    const key = rest[2];
    if (!target || !selector || !key) {
      throw new Error("press requires a target, selector, and key");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/press", {
        target,
        selector,
        key
      }),
      flags.json
    );
    process.exit(0);
  }

  if (command === "wait-for") {
    const target = rest[0];
    const selector = rest[1];
    if (!target || !selector) {
      throw new Error("wait-for requires a target and selector");
    }
    print(
      await requestJson(baseUrl, flags.token, "POST", "/wait-for", {
        target,
        selector,
        timeoutMs: flags.timeoutMs
      }),
      flags.json
    );
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

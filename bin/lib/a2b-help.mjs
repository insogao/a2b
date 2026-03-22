export function formatHelp() {
  return `A2B CLI

Usage:
  a2b -h
  a2b serve [--port <port>] [--token <token>]
  a2b status [--port <port>] [--token <token>] [--json]
  a2b market update [--json]
  a2b market categories [--json]
  a2b market list <category> [--json]
  a2b market show <entry> [--json]
  a2b market search <keyword> [--json]
  a2b tabs [--port <port>] [--token <token>] [--json]
  a2b new [url] [--port <port>] [--token <token>] [--json]
  a2b select <target> [--port <port>] [--token <token>] [--json]
  a2b goto <target> <url> [--port <port>] [--token <token>] [--json]
  a2b reload <target> [--port <port>] [--token <token>] [--json]
  a2b back <target> [--port <port>] [--token <token>] [--json]
  a2b forward <target> [--port <port>] [--token <token>] [--json]
  a2b close <target> [--port <port>] [--token <token>] [--json]
  a2b cookies <target> [--port <port>] [--token <token>] [--json]
  a2b log <target> [--port <port>] [--token <token>] [--json]
  a2b screenshot <target> [--path <file>] [--port <port>] [--token <token>] [--json]
  a2b eval-js <target> <expression> [--port <port>] [--token <token>] [--json]
  a2b run-js <target> <file> [--port <port>] [--token <token>] [--json]
  a2b click <target> <selector> [--port <port>] [--token <token>] [--json]
  a2b type <target> <selector> <text> [--port <port>] [--token <token>] [--json]
  a2b press <target> <selector> <key> [--port <port>] [--token <token>] [--json]
  a2b wait-for <target> <selector> [--timeout-ms <n>] [--port <port>] [--token <token>] [--json]
`;
}

export function formatMarketHelp() {
  return `A2B CLI market

Usage:
  a2b market -h
  a2b market update [--json]
  a2b market categories [--json]
  a2b market list <category> [--json]
  a2b market show <entry> [--json]
  a2b market search <keyword> [--json]

Notes:
  Use \`categories\` to browse top-level groups.
  Use \`list\` for category ids such as \`search\`.
  Use \`show\` for entry ids such as \`search/baidu\`.
`;
}

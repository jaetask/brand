const [name, base = "http://127.0.0.1:8093", may] = process.argv.slice(2);
if (!name) {
  console.error('Usage: npm run connect -- "<name>" [url] [read]');
  process.exit(2);
}

const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const asked = await post("/pair", {
  host: name,
  effects: may === "read" ? ["read"] : ["read", "write"],
});
if (!asked.ok) {
  console.error(`Brand refused: ${await asked.text()}`);
  process.exit(1);
}
const { id, claim } = await asked.json();
console.log(`Asked to connect as "${name}". Approve it on the Connections page of ${base}.`);

for (;;) {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const answer = await post(`/pair/${id}/claim`, { claim });
  if (answer.status === 202) continue;
  if (!answer.ok) {
    console.error("The request was turned down, or it expired.");
    process.exit(1);
  }
  const { token } = await answer.json();
  console.log(`Approved. MCP endpoint: ${base}/mcp`);
  console.log(`Key, shown once (send it as "Authorization: Bearer <key>"): ${token}`);
  break;
}

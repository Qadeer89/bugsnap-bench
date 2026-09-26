const url = "https://bench.bugsnap-ai.com";

const res = await fetch(url);
if (res.status !== 200) {
  console.error(`FAIL: expected 200, got ${res.status}`);
  process.exit(1);
}

console.log("PASS: site returned 200 OK");
process.exit(0);

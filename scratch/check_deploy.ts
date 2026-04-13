import { Client } from "ssh2";

const config = {
  host: "151.243.222.93",
  port: 34789,
  username: "root",
  password: 'Gxt4#3kMNHX&HmJicYj^i&tVkJSAM$7T',
};

function exec(conn: InstanceType<typeof Client>, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err: Error | undefined, stream: any) => {
      if (err) return reject(err);
      let output = "";
      stream.on("data", (data: Buffer) => { output += data.toString(); });
      stream.stderr.on("data", (data: Buffer) => { output += data.toString(); });
      stream.on("close", (code: number) => { resolve(`[Exit code: ${code}]\n${output}`); });
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise<void>((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });

  const run = await exec(conn, "docker run --rm tiktok-scraper-api bun src/index.ts 2>&1");
  console.log("Direct Bun Run:\n", run);

  const logs = await exec(conn, "docker logs tiktok-scraper-api-1 2>&1 | tail -n 20");
  console.log("Container Logs:\n", logs);
  
  conn.end();
}

main().catch(console.error);

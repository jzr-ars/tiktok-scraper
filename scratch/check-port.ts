import { Client } from "ssh2";

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /opt/tiktok-scraper && docker compose run --rm api sh -c "ls -la ../../node_modules"`, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d: Buffer) => out += d.toString());
    stream.stderr.on('data', (d: Buffer) => out += d.toString());
    stream.on('close', () => {
      console.log('OUTPUT:', out);
      conn.end();
    });
  });
}).connect({
  host: "151.243.222.93",
  port: 34789,
  username: "root",
  password: 'Gxt4#3kMNHX&HmJicYj^i&tVkJSAM$7T'
});

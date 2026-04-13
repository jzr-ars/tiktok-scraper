import { Client, type ConnectConfig } from "ssh2";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

/** Load `.env.deploy` into process.env (only keys not already set). */
function loadDeployEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ".env.deploy");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

/** Hostname only: no scheme, path, or port (e.g. scraper.example.com — not https://… or …/path). */
function requireHostname(envName: string, value: string): string {
  const v = value.trim();
  if (!v) throw new Error(`${envName} must not be empty`);
  if (v.includes("://")) {
    throw new Error(
      `${envName} must be a hostname only, without https:// (got: ${v.slice(0, 40)}…)`,
    );
  }
  if (v.includes("/") || v.includes(" ") || v.includes(":")) {
    throw new Error(
      `${envName} looks invalid — use a hostname like scraper.example.com, not a URL or path (got: ${v})`,
    );
  }
  return v;
}

function buildSshConfig(): ConnectConfig {
  const host = requireEnv("DEPLOY_SSH_HOST");
  const port = Number(process.env.DEPLOY_SSH_PORT || "22");
  const username = process.env.DEPLOY_SSH_USER?.trim() || "root";

  const keyPath = process.env.DEPLOY_SSH_KEY_PATH?.trim();
  const keyInline = process.env.DEPLOY_SSH_PRIVATE_KEY?.trim();
  const password = process.env.DEPLOY_SSH_PASSWORD;

  const cfg: ConnectConfig = { host, port, username };

  if (keyPath) {
    if (!fs.existsSync(keyPath)) {
      throw new Error(`DEPLOY_SSH_KEY_PATH file not found: ${keyPath}`);
    }
    cfg.privateKey = fs.readFileSync(keyPath);
    const pass = process.env.DEPLOY_SSH_KEY_PASSPHRASE;
    if (pass) cfg.passphrase = pass;
  } else if (keyInline) {
    cfg.privateKey = keyInline;
    const pass = process.env.DEPLOY_SSH_KEY_PASSPHRASE;
    if (pass) cfg.passphrase = pass;
  } else if (password !== undefined && password !== "") {
    cfg.password = password;
  } else {
    throw new Error(
      "SSH auth: set DEPLOY_SSH_KEY_PATH (or DEPLOY_SSH_PRIVATE_KEY) or DEPLOY_SSH_PASSWORD"
    );
  }

  return cfg;
}

function createLocalArchive(projectRoot: string, outFile: string): void {
  const tryGitArchive = () => {
    execSync("git rev-parse --git-dir", { cwd: projectRoot, stdio: "pipe" });
    execSync(`git archive --format=tar.gz -o "${outFile}" HEAD`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
  };

  try {
    tryGitArchive();
  } catch {
    const excludes = ["node_modules", ".next", "downloads", ".git", ".env", ".env.deploy"]
      .map((e) => `--exclude=${e}`)
      .join(" ");
    // Write archive outside projectRoot so tar does not see the file appear mid-scan ("file changed as we read it")
    execSync(`tar ${excludes} -czf "${outFile}" .`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
  }
}

function exec(
  conn: InstanceType<typeof Client>,
  cmd: string,
  silent = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err: Error | undefined, stream: any) => {
      if (err) return reject(err);
      let output = "";
      let errOutput = "";
      stream.on("data", (data: Buffer) => {
        const str = data.toString();
        output += str;
        if (!silent) process.stdout.write(str);
      });
      stream.stderr.on("data", (data: Buffer) => {
        const str = data.toString();
        errOutput += str;
        if (!silent) process.stderr.write(str);
      });
      stream.on("close", (code: number) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}:\n${output}${errOutput}`));
        } else {
          resolve(output + errOutput);
        }
      });
    });
  });
}

function upload(
  conn: InstanceType<typeof Client>,
  localPath: string,
  remotePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err: Error | undefined, sftp: any) => {
      if (err) return reject(err);
      const content = fs.readFileSync(localPath);
      sftp.writeFile(remotePath, content, (err2: Error | undefined) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

function uploadString(
  conn: InstanceType<typeof Client>,
  content: string,
  remotePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err: Error | undefined, sftp: any) => {
      if (err) return reject(err);
      sftp.writeFile(remotePath, Buffer.from(content), (err2: Error | undefined) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

async function main() {
  loadDeployEnvFile();

  const remoteDir = process.env.DEPLOY_REMOTE_DIR?.trim() || "/opt/tiktok-scraper";
  const domainWeb = requireHostname("DEPLOY_DOMAIN_WEB", requireEnv("DEPLOY_DOMAIN_WEB"));
  const domainApi = requireHostname("DEPLOY_DOMAIN_API", requireEnv("DEPLOY_DOMAIN_API"));
  const jwtSecret = requireEnv("DEPLOY_JWT_SECRET");
  const apiPublicBase =
    process.env.DEPLOY_API_PUBLIC_URL?.trim() || `https://${domainApi}`;

  const sshConfig = buildSshConfig();
  const conn = new Client();

  await new Promise<void>((resolve, reject) => {
    conn.on("ready", () => resolve());
    conn.on("error", (err: Error) => reject(err));
    conn.connect(sshConfig);
  });

  console.log("✅ Connected to VPS!\n");

  console.log("📦 Step 1: Installing dependencies...\n");
  await exec(
    conn,
    "apt-get update -qq && apt-get install -y -qq apache2 docker-compose-plugin curl > /dev/null 2>&1 && echo 'Dependencies installed!'"
  );
  await exec(conn, "docker compose version");

  console.log("\n📁 Step 2: Cleaning and setting up project directory...\n");
  await exec(conn, `rm -rf ${remoteDir} && mkdir -p ${remoteDir}`);
  console.log("Directory cleaned and created.\n");

  console.log("📤 Step 3: Uploading project archive...\n");
  const projectRoot = path.resolve(".");
  const archivePath = path.join(
    os.tmpdir(),
    `tiktok-deploy-${process.pid}-${Date.now()}.tar.gz`
  );
  console.log("Creating archive (git archive HEAD if repo, else tar)...\n");
  try {
    createLocalArchive(projectRoot, archivePath);

    const archiveSize = fs.statSync(archivePath).size;
    console.log(`Archive: ${(archiveSize / 1024 / 1024).toFixed(1)}MB\n`);

    await upload(conn, archivePath, `${remoteDir}/deploy-archive.tar.gz`);
  } finally {
    try {
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    } catch {
      /* ignore */
    }
  }

  console.log("Extracting on VPS...\n");
  await exec(
    conn,
    `cd ${remoteDir} && tar -xzf deploy-archive.tar.gz && rm deploy-archive.tar.gz && echo 'Extracted!'`
  );

  console.log("\n⚙️ Step 4: Creating production env files...\n");
  const rootEnv = `JWT_SECRET=${jwtSecret}
NEXT_PUBLIC_API_URL=${apiPublicBase}
`;
  await uploadString(conn, rootEnv, `${remoteDir}/.env`);

  const apiEnv = `DATABASE_URL=postgres://tiktok:tiktok_secret@postgres:5432/tiktok_scraper
REDIS_URL=redis://redis:6379
JWT_SECRET=${jwtSecret}
`;
  await uploadString(conn, apiEnv, `${remoteDir}/apps/api/.env`);

  const webEnv = `NEXT_PUBLIC_API_URL=${apiPublicBase}
`;
  await uploadString(conn, webEnv, `${remoteDir}/apps/web/.env.local`);
  console.log("Env files written.\n");

  console.log("🐳 Step 5: Building Docker containers...\n");
  await exec(conn, `cd ${remoteDir} && docker compose down --remove-orphans 2>/dev/null || true`);
  await exec(conn, `cd ${remoteDir} && docker compose build 2>&1`);
  await exec(conn, `cd ${remoteDir} && docker compose up -d`);

  console.log("\n⏳ Waiting for services...\n");
  await exec(conn, "sleep 5");
  await exec(conn, `cd ${remoteDir} && docker compose ps`);

  console.log("\n🗃️ Step 6: Database migrations...\n");
  await exec(
    conn,
    `cd ${remoteDir} && docker compose exec -T api bun run db:push 2>&1 || echo 'Migration may need manual run'`
  );

  console.log("\n🌐 Step 7: Apache (reverse proxy)...\n");
  const apacheConfig = `
<VirtualHost *:80>
    ServerName ${domainApi}
    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "http"
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/
    LimitRequestBody 104857600
</VirtualHost>

<VirtualHost *:80>
    ServerName ${domainWeb}
    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "http"
    ProxyPass / http://127.0.0.1:5001/
    ProxyPassReverse / http://127.0.0.1:5001/
</VirtualHost>
`;
  await uploadString(conn, apacheConfig, "/etc/apache2/sites-available/tiktok-scraper.conf");
  await exec(
    conn,
    "a2enmod proxy proxy_http headers > /dev/null 2>&1 || true"
  );
  await exec(
    conn,
    "systemctl stop nginx 2>/dev/null; systemctl disable nginx 2>/dev/null; true"
  );
  await exec(conn, "a2dissite 000-default.conf 2>/dev/null || a2dissite 000-default 2>/dev/null || true");
  await exec(conn, "a2ensite tiktok-scraper.conf 2>&1");
  await exec(conn, "apache2ctl configtest 2>&1");
  await exec(conn, "systemctl reload apache2 2>&1 || systemctl restart apache2 2>&1");
  console.log("Apache site tiktok-scraper.conf enabled.\n");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("📌 Cloudflare / DNS → Apache :80 → Docker host ports:");
  console.log("   Web → http://127.0.0.1:5001");
  console.log("   API → http://127.0.0.1:5000");
  console.log("");
  console.log("🌐 URLs:");
  console.log(`   Frontend: https://${domainWeb}`);
  console.log(`   API base: ${apiPublicBase}`);
  console.log("");
  console.log("🔑 JWT: configured on server (not printed).");
  console.log("=".repeat(60));

  conn.end();
}

main().catch((e) => {
  console.error("❌ Error:", e instanceof Error ? e.message : e);
  process.exit(1);
});

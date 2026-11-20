console.log("✅ config.js is being loaded");

const config = require("/config/smartphoton_jkbms/settings.js");

const fs = require("fs");
const options = JSON.parse(fs.readFileSync("/data/options.json", "utf8"));
const bcrypt = require("bcryptjs");

config.functionGlobalContext = {
  ...(config.functionGlobalContext || {}),
  crypto: require("crypto"),
  fs: require("fs"),
  path: require("path")
};

config.functionExternalModules = true;

if ("theme" in options && options.theme !== "default") {
  config.editorTheme.theme = options.theme;
}

config.debugUseColors = false;
config.flowFile = "flows.json";
config.nodesDir = "/config/smartphoton_jkbms/nodes";
config.uiPort = 1891;
config.userDir = "/config/smartphoton_jkbms/";
config.httpNodeRoot = "/endpoint";

console.log("✅ Node-RED is using userDir =", config.userDir);
console.log("✅ Node-RED is using uiPort =", config.uiPort);

config.credentialSecret = "domosimple";
config.flowFilePretty = true;

config.contextStorage = {
  default: {
    module: "localfilesystem",
    config: {
      dir: "/config/smartphoton_jkbms/global-variables",
      flushInterval: "5"
    }
  }
};

// Login for the Node-RED editor and the built-in dashboard (port 1891).
// No shared default password: either the add-on option "editor_password" or a
// random password generated once per installation and kept in /data.
const EDITOR_USER = "pi";
const EDITOR_AUTH_FILE = "/data/editor_auth.json";

function editorPasswordHash() {
  const fromOption = typeof options.editor_password === "string" ? options.editor_password.trim() : "";
  if (fromOption) {
    console.log(`🔐 Node-RED login: user "${EDITOR_USER}", password from the add-on option "editor_password"`);
    return bcrypt.hashSync(fromOption, 8);
  }
  let password = "";
  try {
    password = String(JSON.parse(fs.readFileSync(EDITOR_AUTH_FILE, "utf8")).password || "");
  } catch (e) {
    // first start: no file yet
  }
  if (!password) {
    password = require("crypto").randomBytes(12).toString("base64url");
    try {
      fs.writeFileSync(EDITOR_AUTH_FILE, JSON.stringify({ password }), { mode: 0o600 });
    } catch (e) {
      console.log("⚠️ Could not store the generated Node-RED password:", e.message);
    }
  }
  console.log(`🔐 Node-RED login: user "${EDITOR_USER}", generated password: ${password}`);
  console.log('🔐 Set the add-on option "editor_password" to choose your own password.');
  return bcrypt.hashSync(password, 8);
}

const editorHash = editorPasswordHash();

config.adminAuth = {
  type: "credentials",
  users: [
    {
      username: EDITOR_USER,
      password: editorHash,
      permissions: "*"
    }
  ]
};

config.httpNodeAuth = {
  user: EDITOR_USER,
  pass: editorHash
};

config.httpStaticAuth = {
  user: EDITOR_USER,
  pass: editorHash
};

if (options.log_level) {
  config.logging.console.level = options.log_level.toLowerCase();
  if (config.logging.console.level === "warning") {
    config.logging.console.level = "warn";
  }
}

module.exports = config;

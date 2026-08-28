#!/usr/bin/env node
/**
 * Minimal static export for Capacitor (webDir = www).
 * Keeps memory-plugin-demo.html as the source of truth for demos + regression.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const www = path.join(root, "www");
const jsDir = path.join(www, "js");

const demoHtml = path.join(root, "memory-plugin-demo.html");
const motionJs = path.join(root, "js", "motion.js");

if (!fs.existsSync(demoHtml)) {
  console.error("Missing memory-plugin-demo.html");
  process.exit(1);
}
if (!fs.existsSync(motionJs)) {
  console.error("Missing js/motion.js");
  process.exit(1);
}

fs.mkdirSync(jsDir, { recursive: true });
fs.copyFileSync(demoHtml, path.join(www, "index.html"));
fs.copyFileSync(motionJs, path.join(www, "js", "motion.js"));

console.log("Prepared Capacitor webDir:");
console.log("  www/index.html  ← memory-plugin-demo.html");
console.log("  www/js/motion.js ← js/motion.js");

import fs from "fs"
import path from "path"
import { execSync } from "child_process"

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file)
    if (fs.statSync(filepath).isDirectory()) {
      walkDir(filepath, callback)
    } else if (filepath.endsWith(".tsx") || filepath.endsWith(".ts")) {
      callback(filepath)
    }
  })
}

const changedFiles = []

walkDir("./src/app", file => {
  let content = fs.readFileSync(file, "utf8")

  // Match themeColor inside metadata export
  const regex =
    /export const metadata\s*=\s*{([\s\S]*?)themeColor:\s*["']([^"']+)["'](,)?([\s\S]*?})/m

  if (regex.test(content)) {
    const newContent = content.replace(
      regex,
      `export const metadata = {$1$4}\n\nexport const viewport = { themeColor: '$2' }`
    )

    fs.writeFileSync(file, newContent, "utf8")
    changedFiles.push(file)
    console.log("✅ Fixed themeColor in:", file)
  }
})

if (changedFiles.length > 0) {
  console.log("\n✨ Running Prettier to format updated files...\n")
  try {
    execSync(`npx prettier --write ${changedFiles.join(" ")}`, { stdio: "inherit" })
    console.log("\n🎉 All done! themeColor issues fixed and files formatted.")
  } catch (err) {
    console.error("⚠️ Prettier formatting failed:", err.message)
  }
} else {
  console.log("✅ No themeColor issues found. Everything is clean!")
}

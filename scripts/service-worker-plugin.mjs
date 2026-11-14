// Vite plugin: emits sw.js = src/sw/service-worker.js plus the list of files
// to precache (every built file and everything in public/). The version is a
// hash of all precached files, so any change ships a new worker and cache.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** All files under a directory, as forward-slash paths relative to it. */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
}

/** @returns {import('vite').Plugin} */
export function serviceWorker() {
  return {
    name: 'gym-app-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const hash = createHash('sha256')
      const files = new Set(['index.html'])
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) continue
        files.add(fileName)
        hash.update(fileName).update(output.type === 'chunk' ? output.code : output.source)
      }
      for (const file of listFiles('public')) {
        files.add(file)
        hash.update(file).update(readFileSync(join('public', file)))
      }
      const template = readFileSync('src/sw/service-worker.js', 'utf8')
      const version = hash.update(template).digest('hex').slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const VERSION = '${version}'\nconst PRECACHE = ${JSON.stringify([...files].sort())}\n${template}`,
      })
    },
  }
}

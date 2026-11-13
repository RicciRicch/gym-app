// GitHub Pages serves 404.html for unknown paths; a copy of index.html lets
// the client-side router handle deep links.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')

import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/index', './src/receipt-net'],
  clean: true,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      minify: true,
    },
  },
})

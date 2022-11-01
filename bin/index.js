#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')

const cmd = 'node --no-warnings ' + resolve(__dirname, '../index.mjs')
spawnSync(cmd, { stdio: 'inherit', shell: true })

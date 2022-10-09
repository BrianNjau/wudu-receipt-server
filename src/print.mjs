import receiptio from '../lib/receiptio.js'
import receiptline from '../lib/receiptline.js'

const $ = String.fromCharCode
const command = {
  ...receiptline.commands.escpos,
  open: function (printer) {
    this.upsideDown = printer.upsideDown
    this.spacing = printer.spacing
    this.cutting = printer.cutting
    this.gradient = printer.gradient
    this.gamma = printer.gamma
    this.threshold = printer.threshold
    this.alignment = 0
    this.left = 0
    this.width = printer.cpl
    this.right = 0
    return (
      // ESC @ - Initialize printer
      '\x1b@' +
      // GS a n - Enable/Disable Automatic Status Back (ASB)
      '\x1da\x00' +
      // ESC M n - Select character font
      '\x1bM' +
      (printer.encoding === 'tis620' ? 'a' : '0') +
      // ESC SP n - Set right-side character spacing
      '\x1b \x00' +
      // FS S n1 n2 - Set left- and right-side Kanji character spacing
      '\x1cS\x00\x00' +
      // ESC 2 - Select default line spacing
      // ESC 3 n - Set line spacing
      (this.spacing ? '\x1b2' : '\x1b3\x00') +
      // ESC { n - Turns on/off upside-down printing mode
      '\x1b{' +
      $(this.upsideDown) +
      // FS . -  Cancel Kanji character mode
      '\x1c.'
    )
  },
  // print horizontal rule: FS C n FS . ESC t n ...
  hr: (width) => '\x1cC\x00\x1c.\x1bt\x01' + '\x95'.repeat(width),
  // print vertical rules: GS ! n FS C n FS . ESC t n ...
  vr: function (widths, height) {
    return widths.reduce((a, w) => a + this.relative(w) + '\x96', '\x1d!' + $(height - 1) + '\x1cC\x00\x1c.\x1bt\x01\x96')
  },
  // start rules: FS C n FS . ESC t n ...
  vrstart: (widths) => '\x1cC\x00\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', '\x9c').slice(0, -1) + '\x9d',
  // stop rules: FS C n FS . ESC t n ...
  vrstop: (widths) => '\x1cC\x00\x1c.\x1bt\x01' + widths.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', '\x9e').slice(0, -1) + '\x9f',
  // print vertical and horizontal rules: FS C n FS . ESC t n ...
  vrhr: function (widths1, widths2, dl, dr) {
    const r1 = ' '.repeat(Math.max(-dl, 0)) + widths1.reduce((a, w) => a + '\x95'.repeat(w) + '\x90', dl > 0 ? '\x9e' : '\x9a').slice(0, -1) + (dr < 0 ? '\x9f' : '\x9b') + ' '.repeat(Math.max(dr, 0))
    const r2 = ' '.repeat(Math.max(dl, 0)) + widths2.reduce((a, w) => a + '\x95'.repeat(w) + '\x91', dl < 0 ? '\x9c' : '\x98').slice(0, -1) + (dr > 0 ? '\x9d' : '\x99') + ' '.repeat(Math.max(-dr, 0))
    return '\x1cC\x00\x1c.\x1bt\x01' + r2.split('').reduce((a, c, i) => a + this.vrtable[c][r1[i]], '')
  },
}

export default async (receiptmd, options) => receiptio.print(receiptmd, options, { extend: 'escpos', command })

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
      '\x1b@'
       +
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
  hr: (width) => '\x1cC\x00\x1c.\x1bt\x01' + '\x95'.repeat(width),
}

export const print = async (receiptmd, options) => receiptio.print(receiptmd, options, { extend: 'escpos', command })

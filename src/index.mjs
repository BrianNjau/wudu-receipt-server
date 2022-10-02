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
      '\x1b@\x1da\x00\x1bM' +
      (printer.encoding === 'tis620' ? 'a' : '0') +
      '\x1b \x00\x1cS\x00\x00' +
      (this.spacing ? '\x1b2' : '\x1b3\x00') +
      '\x1b{' +
      $(this.upsideDown) +
      '\x1c.'
    )
  },
  hr: (width) => '\x1cC\x00\x1c.\x1bt\x01' + '\x95'.repeat(width),
}

export const print = async (receiptmd, options) => receiptio.print(receiptmd, options, { extend: 'escpos', command })

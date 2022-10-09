import USB from './lib/escpos-usb.mjs'
import print from './src/print.mjs'
import { log, toHex, buildBill, buildOrder } from './src/utils.mjs'

import net from 'node:net'
import express from 'express'
import cors from 'cors'

const { findPrinter } = USB

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/**
 * Print main function
 * @param {{ body: { toPrintBillContent: (import('./src/utils.mjs').ToPrintBillContent)[]; toPrintOrderContent: (import('./src/utils.mjs').ToPrintOrderContent)[] } }} req
 * @param {*} res
 * @returns
 */
async function Print(req, res) {
  const printers = findPrinter()
  const hasUsbPrinters = !!printers.length
  /** @type {string[]} */
  const errList = []
  /** @type {string[]} */
  const successList = []

  if (!('toPrintBillContent' in req.body) && !('toPrintOrderContent' in req.body)) {
    const resMsg = `Failed: 'toPrintBillContent' and 'toPrintOrderContent' not in the body.`
    errList.push(resMsg)
    res.json({
      resCode: '1',
      resMsg,
    })
  }

  const { toPrintBillContent, toPrintOrderContent } = req.body
  if (!(toPrintBillContent && toPrintBillContent.length) && !(toPrintOrderContent && toPrintOrderContent.length)) {
    const resMsg = `'toPrintBillContent' and 'toPrintOrderContent' empty.`
    errList.push(resMsg)
    res.json({
      resCode: '0',
      resMsg,
    })
  }

  if (toPrintBillContent && toPrintBillContent.length) {
    for (const record of toPrintBillContent) {
      try {
        const { hardwareType, ip, vid, pid, customerContent } = record
        const { isDelivery, takeawayNo } = customerContent
        const isTakeaway = !!takeawayNo
        const billType = isDelivery ? 'Delivery' : isTakeaway ? 'Takeaway' : 'Onsite'
        const billInfo = customerContent.statementID || customerContent.tableCode || customerContent.takeawayNo || customerContent.receiverName
        if (hardwareType === 'Network') {
          if (!ip) return errList.push(`'ip' empty.`)
          if (net.isIP(ip) !== 4) return errList.push(`'ip: ${ip}' incorrect, should be IPv4 format like: '1.1.1.1'.`)
          await print(buildBill(customerContent), `-d ${ip} -l zh`)
          successList.push(`Print bill:${billType}|${billInfo} to Network:${ip} done.`)
        } else if (hardwareType === 'USB') {
          if (!hasUsbPrinters) {
            errList.push(`USB Printers Not Found`)
          } else {
            const commands = await print(buildBill(customerContent), `-l zh`)
            const device = new USB(vid, pid)
            device.open((err) => {
              if (err) {
                errList.push(err)
              } else {
                device.write(Buffer.from(commands, 'binary'), device.close)
              }
            })
            successList.push(`Print bill:${billType}|${billInfo} to USB:${vid}|${pid} done.`)
          }
        } else {
          errList.push(`Unsupported hardwareType: ${hardwareType}`)
        }
      } catch (err) {
        errList.push(err)
      }
    }
  }

  if (toPrintOrderContent && toPrintOrderContent.length) {
    for (const record of toPrintOrderContent) {
      try {
        const { hardwareType, ip, vid, pid, chefContent } = record
        if (hardwareType === 'Network') {
          if (!ip) return errList.push(`'ip' empty.`)
          if (net.isIP(ip) !== 4) return errList.push(`'ip: ${ip}' incorrect, should be IPv4 format like: '1.1.1.1'.`)
          for (const orderCustomContent of chefContent) {
            const orderInfo = `${orderCustomContent.food.name} x ${orderCustomContent.food.num}`
            await print(buildOrder(orderCustomContent), `-d ${ip} -l zh`)
            successList.push(`Print order:${orderInfo} to Network:${ip} done.`)
          }
        } else if (hardwareType === 'USB') {
          if (!hasUsbPrinters) {
            errList.push(`USB Printers Not Found`)
          } else {
            for (const orderCustomContent of chefContent) {
              const commands = await print(buildOrder(orderCustomContent), `-l zh`)
              const device = new USB(vid, pid)
              device.open((err) => {
                if (err) {
                  errList.push(err)
                } else {
                  device.write(Buffer.from(commands, 'binary'), device.close)
                }
              })
              const orderInfo = `${orderCustomContent.food.name} x ${orderCustomContent.food.num}`
              successList.push(`Print order:${orderInfo} to USB:${vid}|${pid} done.`)
            }
          }
        } else {
          errList.push(`Unsupported hardwareType: ${hardwareType}`)
        }
      } catch (err) {
        errList.push(err)
      }
    }
  }

  if (errList.length) {
    log(`req.body|${JSON.stringify(req.body)}`, {
      prefix: '[INFO]',
      skip: true,
    })
    errList.forEach((err) => {
      log(err, {
        prefix: '[ERROR]',
      })
    })
  }
  if (successList.length) {
    successList.forEach((success) => {
      log(success, {
        prefix: '[SUCCESS]',
      })
    })
    res.json({
      resCode: '0',
      resMsg: `Print success.`,
    })
  } else {
    res.json({
      resCode: '1',
      resMsg: `Print failed.`,
    })
  }
}

app.post('/print', Print)
app.listen(2000, () => {
  log(`////////// Printer Tool Start //////////`)

  // Print out USB printers - 寻找本地的USB打印机
  const printers = findPrinter()
  if (!printers.length) {
    log(`USB Printers Not Found`, {
      prefix: '[INFO]',
      skip: true,
    })
  } else {
    log(`${printers.length} USB Printers Found`, {
      prefix: '[INFO]',
      details: JSON.stringify(printers),
      skip: true,
    })
    printers.forEach(({ deviceDescriptor: { idVendor: vid, idProduct: pid } }, i) => log(`vid:0x${toHex(vid)}|pid:0x${toHex(pid)}`, { prefix: `[USB Printer ${i + 1}]` }))
  }
})

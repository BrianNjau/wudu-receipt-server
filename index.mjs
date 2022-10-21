import USB from './lib/escpos-usb.mjs'
import print from './src/print.mjs'
import { PRINT_TIME } from './src/constants.mjs'
import { log, toHex, buildBill, buildOrder, sleep } from './src/utils.mjs'

import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import express from 'express'
import cors from 'cors'

const sessionPath = path.join(process.cwd(), './session.log')
let taskList = []
const printEnd = () => {
  if (fs.existsSync(sessionPath)) {
    if (taskList.length) {
      fs.writeFileSync(sessionPath, taskList[0])
      taskList = taskList.slice(1)
    } else {
      fs.unlinkSync(sessionPath)
    }
  }
}
const readSession = () => {
  if (fs.existsSync(sessionPath)) {
    return fs.readFileSync(sessionPath, 'utf8')
  } else {
    return ''
  }
}

try {
  const { findPrinter } = USB

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  /**
   * @public
   * @typedef Body
   * @property {(import('./src/utils.mjs').ToPrintBillContent)[]} toPrintBillContent
   * @property {(import('./src/utils.mjs').ToPrintOrderContent)[]} toPrintOrderContent
   */

  /**
   * Print main function
   * @param {{ body: Body }} req
   * @param {*} res
   * @returns
   */
  async function onPrint(req, res) {
    try {
      /**
       * Go print
       * @param {Body} body
       */
      const go = async (session, body) => {
        fs.writeFileSync(sessionPath, session)

        try {
          /** @type {string[]} */
          const errList = []
          /** @type {string[]} */
          const successList = []
          const printers = findPrinter()
          const hasUsbPrinters = !!printers.length

          if (!('toPrintBillContent' in body) && !('toPrintOrderContent' in body)) {
            const resMsg = `Session:${session}|Print failed: 'toPrintBillContent' and 'toPrintOrderContent' not in the body.`
            log(resMsg, {
              prefix: '[ERROR]',
            })
            printEnd()
            return res.json({ resCode: '1', resMsg, session })
          }

          const { toPrintBillContent, toPrintOrderContent } = body
          if (!(toPrintBillContent && toPrintBillContent.length) && !(toPrintOrderContent && toPrintOrderContent.length)) {
            const resMsg = `Session:${session}|Print failed: 'toPrintBillContent' and 'toPrintOrderContent' empty.`
            log(resMsg, { prefix: '[ERROR]' })
            printEnd()
            return res.json({ resCode: '0', resMsg, session })
          }

          const printTimeMap = {}
          const toPrintList = [...(toPrintBillContent || []), ...(toPrintOrderContent || [])]
          toPrintList.forEach(({ ip, vid }) => {
            if (ip) {
              if (ip in printTimeMap) {
                printTimeMap[ip] += PRINT_TIME
              } else {
                printTimeMap[ip] = PRINT_TIME
              }
            } else if (vid) {
              if (vid in printTimeMap) {
                printTimeMap[vid] += PRINT_TIME
              } else {
                printTimeMap[vid] = PRINT_TIME
              }
            }
          })

          if (toPrintBillContent && toPrintBillContent.length) {
            for (const record of toPrintBillContent) {
              try {
                const { hardwareType, ip, vid, pid, customerContent } = record
                const { isDelivery, statementID, tableCode, takeawayNo, receiverName, attendant, remark } = customerContent
                const isTakeaway = !!takeawayNo
                const billType = isDelivery ? 'Delivery' : isTakeaway ? 'Takeaway' : 'Onsite'
                const billInfo = [statementID, tableCode || takeawayNo || receiverName, attendant, remark].join(':')
                if (hardwareType === 'Network') {
                  if (!ip) return errList.push(`Session:${session}|Print bill:${billType}|${billInfo} to Network failed: ip empty.`)
                  if (net.isIP(ip) !== 4) return errList.push(`Session:${session}|Print bill:${billType}|${billInfo} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
                  await print(buildBill(customerContent), `-d ${ip} -l zh`)
                  const waitTime = printTimeMap[ip]
                  await sleep(waitTime)
                  printEnd()
                  successList.push(`Session:${session}|Print bill:${billType}|${billInfo} to Network:${ip} success.`)
                } else if (hardwareType === 'USB') {
                  if (!hasUsbPrinters) {
                    errList.push(`Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed: USB Printers Not Found`)
                  } else {
                    const commands = await print(buildBill(customerContent), `-l zh`)
                    const device = new USB(vid, pid)
                    device.open((err) => {
                      if (err) {
                        errList.push(`Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device open failed: ${err}.`)
                        device.close(printEnd)
                      } else {
                        device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                          if (writeErr) {
                            errList.push(`Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`)
                          }
                          const waitTime = printTimeMap[vid]
                          await sleep(waitTime)
                          device.close(printEnd)
                        })
                      }
                    })
                    successList.push(`Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} success.`)
                  }
                } else {
                  errList.push(`Session:${session}|Print bill:${billType}|${billInfo} failed: Unsupported hardwareType: ${hardwareType}`)
                }
              } catch (err) {
                errList.push(`Session:${session}|Print bill failed:${err}`)
              }
            }
          }

          if (toPrintOrderContent && toPrintOrderContent.length) {
            for (const record of toPrintOrderContent) {
              try {
                const { hardwareType, ip, vid, pid, chefContent } = record
                if (!chefContent.length) return errList.push(`Session:${session}|chefContent empty.`)
                const { tableCode, takeawayNo, statementID, attendant, remark } = chefContent[0]
                const orderInfo = ['Order Info', chefContent.length, statementID, tableCode || takeawayNo || `Delivery`, attendant, remark, chefContent.map(({ food }) => `${food.name} x ${food.num}`).join('|')].join(':')
                if (hardwareType === 'Network') {
                  if (!ip) return errList.push(`Session:${session}|Print order to Network failed: ip empty.`)
                  if (net.isIP(ip) !== 4) return errList.push(`Session:${session}|Print order to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
                  const commands = chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n')
                  await print(commands, `-d ${ip} -l zh`)
                  const waitTime = printTimeMap[ip]
                  await sleep(waitTime)
                  printEnd()
                  successList.push(`Session:${session}|Print order to Network:${ip} success`)
                  successList.push(orderInfo)
                } else if (hardwareType === 'USB') {
                  if (!hasUsbPrinters) {
                    errList.push(`Session:${session}|Print order to USB:${vid}|${pid} failed: USB Printers Not Found`)
                    errList.push(orderInfo)
                  } else {
                    const commands = await print(chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n'), `-l zh`)
                    const device = new USB(vid, pid)
                    device.open((err) => {
                      if (err) {
                        errList.push(`Session:${session}|Print order to USB:${vid}|${pid} failed: USB device open failed: ${err}`)
                        errList.push(orderInfo)
                        device.close(printEnd)
                      } else {
                        device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                          if (writeErr) {
                            errList.push(`Session:${session}|Print order to USB:${vid}|${pid} failed: USB device write failed: ${writeErr}`)
                            errList.push(orderInfo)
                          }
                          const waitTime = printTimeMap[vid]
                          await sleep(waitTime)
                          device.close(printEnd)
                        })
                      }
                    })
                    successList.push(`Session:${session}|Print order to USB:${vid}|${pid} success`)
                    successList.push(orderInfo)
                  }
                } else {
                  errList.push(`Session:${session}|Print order to USB:${vid}|${pid} failed: Unsupported hardwareType: ${hardwareType}`)
                  successList.push(orderInfo)
                }
              } catch (err) {
                errList.push(`Session:${session}|Print order failed:${err}`)
              }
            }
          }

          if (errList.length) {
            log(`body|${JSON.stringify(body)}`, {
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
            return res.json({
              resCode: '0',
              resMsg: `Print success.`,
              session,
            })
          } else {
            printEnd()
            return res.json({
              resCode: '1',
              resMsg: `Print failed${errList.length ? `: ${errList[0]}` : ''}.`,
              session,
            })
          }
        } catch (err) {
          log(err, { prefix: '[ERROR]' })
          printEnd()
          return res.json({
            resCode: '1',
            resMsg: `Print failed: ${err.message}.`,
            session,
          })
        }
      }

      if (!fs.existsSync(sessionPath)) {
        const session = Date.now().toString()
        go(session, req.body)
      } else {
        const session = Date.now().toString()
        taskList.push(session)
        const watcher = fs.watch(sessionPath, () => {
          if (readSession() === session) {
            go(session, req.body)
            watcher.close()
          }
        })
      }
    } catch (err) {
      log(err, { prefix: '[ERROR]' })
      printEnd()
      return res.json({
        resCode: '1',
        resMsg: `Print failed: ${err.message}.`,
      })
    }
  }

  /**
   * Lisenter funtioner on app start
   */
  function listener() {
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

    // Clean prev session.log
    printEnd()
  }

  /**
   * Error handling function for app listener
   * @param {Error} err
   */
  function onError(err) {
    log(`${err.code}: Port 2000 already in use(端口已启用或被占用)`, { prefix: '[ERROR]', details: err.message })
    printEnd()
  }

  app.post('/print', onPrint)
  app.listen(2000, listener).on('error', onError)
} catch (err) {
  log(err, { prefix: '[ERROR]' })
  printEnd()
}

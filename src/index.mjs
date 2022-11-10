import fs from 'node:fs'
import net from 'node:net'
import crypto from 'node:crypto'
import cors from 'cors'
import ping from 'ping'
import express from 'express'
import chokidar from 'chokidar'

import USB from '../lib/escpos-usb.mjs'
import * as receiptio from '../lib/receiptio.js'
import { OTHER_BRAND, PRINT_TIME, SESSION_PATH } from './constants.mjs'
import { log, done, fail, toHex, buildBill, buildOrder, buildRefund, sleep, getPackageJson, buildRevenueAnalysis, IPListener, TaskQueue } from './utils.mjs'

const print = receiptio.print
const taskQueue = new TaskQueue() // Printing task handling
const ipListener = new IPListener() // Listening to the printer ip(s)

try {
  const { findPrinter } = USB

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  /**
   * @public
   * @typedef Body
   * @property {(import('./utils.mjs').ToPrintBillContent)[]} toPrintBillContent
   * @property {(import('./utils.mjs').ToPrintOrderContent)[]} toPrintOrderContent
   * @property {(import('./utils.mjs').ToPrintRefundContent)[]} toPrintRefundContent
   * @property {(import('./utils.mjs').ToPrintRevenueAnalysisContent)[]} toPrintRevenueAnalysisContent
   */

  /**
   * Go print
   * @param {string} session
   * @param {Body} body
   * @param {express.Response} res
   */
  async function go(session, body, res) {
    /**
     * Send to client
     * @param {'0' | '1'} resCode
     * @param {string} resMsg
     */
    const send = (resCode, resMsg) => {
      if (!res.headersSent) {
        res.json({
          resCode,
          resMsg,
          session,
        })
      }
    }
    /**
     * Handle log/session clear/res send
     * @param {'0' | '1'} code 0-success, 1-fail
     * @param {string} msg Error msg
     * @param {Function} [customNext]
     */
    const handler = (code, msg, customNext) => {
      if (code === '0') done(`Session:${session}|${msg}`)
      else fail(`Session:${session}|${msg}`)
      if (customNext) customNext()
      else taskQueue.next()
      send(code, msg)
    }

    try {
      taskQueue.setSession(session)

      const printers = findPrinter()
      const hasUsbPrinters = !!printers.length

      if (!('toPrintBillContent' in body) && !('toPrintOrderContent' in body) && !('toPrintRefundContent' in body) && !('toPrintRevenueAnalysisContent' in body)) {
        return handler('1', `Print failed: 'toPrintBillContent', 'toPrintOrderContent', 'toPrintRefundContent' and 'toPrintRevenueAnalysisContent' not in the body.`)
      }

      const { toPrintBillContent, toPrintOrderContent, toPrintRefundContent, toPrintRevenueAnalysisContent } = body
      if (!(toPrintBillContent && toPrintBillContent.length) && !(toPrintOrderContent && toPrintOrderContent.length) && !(toPrintRefundContent && toPrintRefundContent.length) && !(toPrintRevenueAnalysisContent && toPrintRevenueAnalysisContent.length)) {
        return handler('1', `Print failed: 'toPrintBillContent', 'toPrintOrderContent', 'toPrintRefundContent' and 'toPrintRevenueAnalysisContent' empty.`)
      }

      const printTimeMap = {}
      const toPrintList = [...(toPrintBillContent || []), ...(toPrintOrderContent || []), ...(toPrintRefundContent || []), ...(toPrintRevenueAnalysisContent || [])]
      toPrintList.forEach(({ pid, chefContent }) => {
        const time = chefContent ? chefContent.length * PRINT_TIME : PRINT_TIME
        if (pid) {
          if (pid in printTimeMap) {
            printTimeMap[pid] += time
          } else {
            printTimeMap[pid] = time
          }
        }
      })

      if (toPrintBillContent && toPrintBillContent.length) {
        const printType = 'bill'
        for (const record of toPrintBillContent) {
          try {
            const { hardwareType, ip, vid, pid, customerContent } = record
            const { statementID, tableCode, takeawayNo, receiverName, attendant, remark } = customerContent
            const billInfo = [`Session:${session}`, printType, `ID:${statementID}`, tableCode ? `Onsite:${tableCode}` : takeawayNo ? `Takeaway:${takeawayNo}` : `Delivery:${receiverName}`, `Attendant:${attendant}`, `Remark:${remark}`].join('|')
            log(billInfo, { prefix: '[INFO]' })
            if (hardwareType === 'Network') {
              if (!ip) handler('1', `Print ${printType} to Network failed: ip empty.`)
              else if (net.isIP(ip) !== 4) handler('1', `Print ${printType} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
              else {
                ipListener.push(ip)
                ping.sys.probe(ip, async function (isAlive) {
                  if (!isAlive) handler('1', `Print ${printType} to Network failed: ip:${ip} failed to connect.`)
                  else {
                    await print(buildBill(customerContent), `-d ${ip} -l zh -p generic`)
                    handler('0', `Print ${printType} to Network:${ip} success.`)
                  }
                })
              }
            } else if (hardwareType === 'USB') {
              if (!hasUsbPrinters) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB Printers Not Found`)
              else {
                const commands = await print(buildBill(customerContent), `-l zh -p generic`)
                const device = new USB(vid, pid)
                device.open((err) => {
                  if (err) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device open failed: ${err}.`)
                  else {
                    device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                      if (writeErr) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device write failed: ${writeErr}.`, () => device.close(taskQueue.next))
                      else {
                        const waitTime = printTimeMap[pid]
                        await sleep(waitTime)
                        handler('0', `Print ${printType} to USB:[${vid};${pid}] success.`, () => device.close(taskQueue.next))
                      }
                    })
                  }
                })
              }
            } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print ${printType}: ignore hardwareType ${hardwareType}`)
            else handler('1', `Print ${printType} failed: Unsupported hardwareType: ${hardwareType}`)
          } catch (err) {
            handler('1', `Print ${printType} failed: ${err.message}`)
          }
        }
      }

      if (toPrintOrderContent && toPrintOrderContent.length) {
        const printType = 'order'
        for (const record of toPrintOrderContent) {
          try {
            const { hardwareType, ip, vid, pid, chefContent } = record
            if (!chefContent.length) handler('1', `chefContent empty.`)
            else {
              const { tableCode, takeawayNo, statementID, attendant, remark } = chefContent[0]
              const orderInfo = [`Session:${session}`, printType, `Length:${chefContent.length}`, `ID:${statementID}`, tableCode ? `Onsite:${tableCode}` : takeawayNo ? `Takeaway:${takeawayNo}` : `Delivery`, `Attendant:${attendant}`, `Remark:${remark}`, `[${chefContent.map(({ food }) => `${food.name} x ${food.num}`).join(';')}]`].join('|')
              log(orderInfo, { prefix: '[INFO]' })
              if (hardwareType === 'Network') {
                if (!ip) handler('1', `Print ${printType} to Network failed: ip empty.`)
                else if (net.isIP(ip) !== 4) handler('1', `Print ${printType} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
                else {
                  ipListener.push(ip)
                  ping.sys.probe(ip, async function (isAlive) {
                    if (!isAlive) handler('1', `Print ${printType} to Network failed: ip:${ip} failed to connect.`)
                    else {
                      const commands = chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n')
                      await print(commands, `-d ${ip} -l zh -p generic`)
                      handler('0', `Print ${printType} to Network:${ip} success.`)
                    }
                  })
                }
              } else if (hardwareType === 'USB') {
                if (!hasUsbPrinters) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB Printers Not Found`)
                else {
                  const commands = await print(chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n'), `-l zh -p generic`)
                  const device = new USB(vid, pid)
                  device.open((err) => {
                    if (err) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device open failed: ${err}`)
                    else {
                      device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                        if (writeErr) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device write failed: ${writeErr}`, () => device.close(taskQueue.next))
                        else {
                          const waitTime = printTimeMap[pid]
                          await sleep(waitTime)
                          handler('0', `Print ${printType} to USB:[${vid};${pid}] success.`, () => device.close(taskQueue.next))
                        }
                      })
                    }
                  })
                }
              } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print ${printType} to USB:[${vid};${pid}]: ignore hardwareType ${hardwareType}`)
              else handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: Unsupported hardwareType: ${hardwareType}`)
            }
          } catch (err) {
            handler('1', `Print ${printType} failed: ${err.message}`)
          }
        }
      }

      if (toPrintRefundContent && toPrintRefundContent.length) {
        const printType = 'refund'
        for (const record of toPrintRefundContent) {
          try {
            const { hardwareType, ip, vid, pid, refundContent } = record
            if (!refundContent) handler('1', `refundContent empty.`)
            else if (!refundContent.food) handler('1', `refundContent.food empty.`)
            else {
              const { food, tableCode, attendant } = refundContent
              const { name, modifier, num } = food
              const refundInfo = [`Session:${session}`, printType, `${name}${modifier ? `[${modifier}]` : ''} x ${num}`, `Onsite:${tableCode}`, `Attendant:${attendant}`].join('|')
              log(refundInfo, { prefix: '[INFO]' })
              if (hardwareType === 'Network') {
                if (!ip) handler('1', `Print ${printType} to Network failed: ip empty.`)
                else if (net.isIP(ip) !== 4) handler('1', `Print ${printType} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
                else {
                  ipListener.push(ip)
                  ping.sys.probe(ip, async function (isAlive) {
                    if (!isAlive) handler('1', `Print ${printType} to Network failed: ip:${ip} failed to connect.`)
                    else {
                      await print(buildRefund(refundContent), `-d ${ip} -l zh -p generic`)
                      handler('0', `Print ${printType} to Network:${ip} success.`)
                    }
                  })
                }
              } else if (hardwareType === 'USB') {
                if (!hasUsbPrinters) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB Printers Not Found`)
                else {
                  const commands = await print(buildRefund(refundContent), `-l zh -p generic`)
                  const device = new USB(vid, pid)
                  device.open((err) => {
                    if (err) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device open failed: ${err}.`)
                    else {
                      device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                        if (writeErr) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device write failed: ${writeErr}.`, () => device.close(taskQueue.next))
                        else {
                          const waitTime = printTimeMap[pid]
                          await sleep(waitTime)
                          handler('0', `Print ${printType} to USB:[${vid};${pid}] success.`, () => device.close(taskQueue.next))
                        }
                      })
                    }
                  })
                }
              } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print ${printType}: ignore hardwareType ${hardwareType}`)
              else handler('1', `Print ${printType} failed: Unsupported hardwareType: ${hardwareType}`)
            }
          } catch (err) {
            handler('1', `Print ${printType} failed: ${err.message}`)
          }
        }
      }

      if (toPrintRevenueAnalysisContent && toPrintRevenueAnalysisContent.length) {
        const printType = 'report'
        for (const record of toPrintRevenueAnalysisContent) {
          try {
            const { hardwareType, ip, vid, pid, revenueAnalysis } = record
            const { startDate, endDate, shopName } = revenueAnalysis
            const reportInfo = [`Session:${session}`, printType, `Start:${startDate}`, `End:${endDate}`, `Shop:${shopName}`].join('|')
            log(reportInfo, { prefix: '[INFO]' })
            if (hardwareType === 'Network') {
              if (!ip) handler('1', `Print ${printType} to Network failed: ip empty.`)
              else if (net.isIP(ip) !== 4) handler('1', `Print ${printType} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
              else {
                ipListener.push(ip)
                ping.sys.probe(ip, async function (isAlive) {
                  if (!isAlive) handler('1', `Print ${printType} to Network failed: ip:${ip} failed to connect.`)
                  else {
                    await print(buildRevenueAnalysis(revenueAnalysis), `-d ${ip} -l zh -p generic`)
                    handler('0', `Print ${printType} to Network:${ip} success.`)
                  }
                })
              }
            } else if (hardwareType === 'USB') {
              if (!hasUsbPrinters) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB Printers Not Found`)
              else {
                const commands = await print(buildRevenueAnalysis(revenueAnalysis), `-l zh -p generic`)
                const device = new USB(vid, pid)
                device.open((err) => {
                  if (err) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device open failed: ${err}.`)
                  else {
                    device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                      if (writeErr) handler('1', `Print ${printType} to USB:[${vid};${pid}] failed: USB device write failed: ${writeErr}.`, () => device.close(taskQueue.next))
                      else {
                        const waitTime = printTimeMap[pid]
                        await sleep(waitTime)
                        handler('0', `Print ${printType} to USB:[${vid};${pid}] success.`, () => device.close(taskQueue.next))
                      }
                    })
                  }
                })
              }
            } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print ${printType}: ignore hardwareType ${hardwareType}`)
            else handler('1', `Print ${printType} failed: Unsupported hardwareType: ${hardwareType}`)
          } catch (err) {
            handler('1', `Print ${printType} failed: ${err.message}`)
          }
        }
      }
    } catch (err) {
      handler('1', `Print failed: ${err.message}.`)
    }
  }

  /**
   * Print main function
   * @param {express.Request} req
   * @param {express.Response} res
   */
  async function onPrint(req, res) {
    const session = crypto.randomUUID()

    try {
      if (!fs.existsSync(SESSION_PATH)) {
        go(session, req.body, res)
      } else {
        taskQueue.push(session)
        const watcher = chokidar.watch(SESSION_PATH).on('change', () => {
          if (taskQueue.getSession() === session) {
            go(session, req.body, res)
            watcher.close()
          }
        })
      }
    } catch (err) {
      const msg = `Print failed: ${err.message}.`
      fail(`Session:${session}|${msg}`)
      taskQueue.next()
      if (!res.headersSent) {
        res.json({
          resCode: '1',
          resMsg: msg,
          session,
        })
      }
    }
  }

  /**
   * Lisenter funtioner on app start
   */
  function onListen() {
    const { name, version } = getPackageJson()
    log(`////////// ${name} ${version} Started //////////`)

    // Print out USB printers
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
      printers.forEach(({ deviceDescriptor: { idVendor: vid, idProduct: pid } }, i) => log(`vid:0x${toHex(vid)}|pid:0x${toHex(pid)}`, { prefix: `[INFO]USB Printer ${i + 1}|` }))
    }

    // Clean prev session.log
    taskQueue.next()
  }

  /**
   * Error handling function for app listener
   * @param {Error} err
   */
  function onError(err) {
    fail(`${err.code}: Port 2000 already in use(端口已启用或被占用)`, { details: err.message })
    taskQueue.next()
  }

  app.post('/print', onPrint)
  app.listen(2000, onListen).on('error', onError)
} catch (err) {
  fail(err)
  taskQueue.next()
}

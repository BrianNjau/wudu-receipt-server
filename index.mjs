#!/usr/bin/env node

import USB from './lib/escpos-usb.mjs'
import print from './src/print.mjs'
<<<<<<< HEAD
import { PRINT_TIME } from './src/constants.mjs'
import { log, toHex, buildBill, buildOrder, sleep, buildRevenueAnalysis } from './src/utils.mjs'
=======
import { OTHER_BRAND, PRINT_TIME } from './src/constants.mjs'
import { log, done, fail, toHex, buildBill, buildOrder, buildRefund, sleep, getPackageJson } from './src/utils.mjs'
>>>>>>> 0220cc71d16ec90e9b4e8e4490b6226b756f5d26

import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import ping from 'ping'
import chokidar from 'chokidar'

const { name, version } = getPackageJson()

const sessionPath = path.join(process.cwd(), './session.log')
let taskList = []
const next = () => {
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
<<<<<<< HEAD
   * @property {(import('./src/utils.mjs').ToPrintRevenueAnalysisContent)} toPrintRevenueAnalysisContent
=======
   * @property {(import('./src/utils.mjs').ToPrintRefundContent)[]} toPrintRefundContent
>>>>>>> 0220cc71d16ec90e9b4e8e4490b6226b756f5d26
   */

  /**
   * Go print
   * @param {string} session
   * @param {Body} body
   * @param {express.Response} res
   */
  async function go(session, body, res) {
    try {
      fs.writeFileSync(sessionPath, session)
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
       * @param {Function} customNext
       */
      const handler = (code, msg, customNext) => {
        if (code === '0') done(`Session:${session}|${msg}`)
        else fail(`Session:${session}|${msg}`)
        if (customNext) customNext()
        else next()
        send(code, msg)
      }

      const printers = findPrinter()
      const hasUsbPrinters = !!printers.length

<<<<<<< HEAD
          if (!('toPrintBillContent' in body) && !('toPrintOrderContent' in body) && !('toPrintRevenueAnalysisContent' in body)) {
            const resMsg = `Session:${session}|Print failed: 'toPrintBillContent' and 'toPrintOrderContent' and 'toPrintRevenueAnalysisContent' not in the body.`
            log(resMsg, {
              prefix: '[ERROR]',
            })
            return res.json({ resCode: '1', resMsg, session })
          }

          const { toPrintBillContent, toPrintOrderContent, toPrintRevenueAnalysisContent } = body
          if (!(toPrintBillContent && toPrintBillContent.length) && !(toPrintOrderContent && toPrintOrderContent.length) && !(toPrintRevenueAnalysisContent && toPrintRevenueAnalysisContent.length)) {
            const resMsg = `Session:${session}|Print failed: 'toPrintBillContent' and 'toPrintOrderContent' and 'toPrintRevenueAnalysisContent' empty.`
            log(resMsg, { prefix: '[ERROR]' })
            return res.json({ resCode: '0', resMsg, session })
=======
      if (!('toPrintBillContent' in body) && !('toPrintOrderContent' in body) && !('toPrintRefundContent' in body)) {
        return handler('1', `Print failed: 'toPrintBillContent', 'toPrintOrderContent' and 'toPrintRefundContent' not in the body.`)
      }

      const { toPrintBillContent, toPrintOrderContent, toPrintRefundContent } = body
      if (!(toPrintBillContent && toPrintBillContent.length) && !(toPrintOrderContent && toPrintOrderContent.length) && !(toPrintRefundContent && toPrintRefundContent.length)) {
        return handler('1', `Print failed: 'toPrintBillContent', 'toPrintOrderContent' and 'toPrintRefundContent' empty.`)
      }

      const printTimeMap = {}
      const toPrintList = [...(toPrintBillContent || []), ...(toPrintOrderContent || []), ...(toPrintRefundContent || [])]
      toPrintList.forEach(({ pid, chefContent }) => {
        const time = chefContent ? chefContent.length * PRINT_TIME : PRINT_TIME
        if (pid) {
          if (pid in printTimeMap) {
            printTimeMap[pid] += time
          } else {
            printTimeMap[pid] = time
>>>>>>> 0220cc71d16ec90e9b4e8e4490b6226b756f5d26
          }
        }
      })

<<<<<<< HEAD
          // TODO: calc printTime based on ip/vid:pid
          const printTimeMap = {}
          // const printTime = (!toPrintBillContent ? 0 : toPrintBillContent.length + !toPrintOrderContent ? 0 : toPrintOrderContent.length) * PRINT_TIME
          // const waitTime = printTime > WRITE_TIME ? WRITE_TIME : printTime - WRITE_TIME
          const toPrintList = [...(toPrintBillContent || []), ...(toPrintOrderContent || []), ...(toPrintRevenueAnalysisContent|| [])]
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

          if (toPrintRevenueAnalysisContent && toPrintRevenueAnalysisContent.length) {
            for (const record of toPrintRevenueAnalysisContent) {
              try {
                const { hardwareType, ip, vid, pid, revenueAnalysis } = record
                const { startDate, endDate, shopName } = revenueAnalysis
                const receiptType = 'Revenue_Analysis'
                const billInfo = [startDate, endDate, shopName].join(':')
                if (hardwareType === 'Network') {
                  if (!ip) return errList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to Network failed: ip empty.`)
                  if (net.isIP(ip) !== 4) return errList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
                  await print(buildRevenueAnalysis(revenueAnalysis), `-d ${ip} -l zh`)
                  const waitTime = printTimeMap[ip]
                  await sleep(waitTime)
                  printEnd()
                  successList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to Network:${ip} success.`)
                } else if (hardwareType === 'USB') {
                  if (!hasUsbPrinters) {
                    errList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to USB:${vid}|${pid} failed: USB Printers Not Found`)
                  } else {
                    const commands = await print(buildRevenueAnalysis(revenueAnalysis), `-l zh`)
                    const device = new USB(vid, pid)
                    device.open((err) => {
                      if (err) {
                        errList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to USB:${vid}|${pid} failed|USB device open failed: ${err}.`)
                      } else {
                        device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                          if (writeErr) {
                            errList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`)
                          }
                          const waitTime = printTimeMap[vid]
                          await sleep(waitTime)
                          device.close(printEnd)
                        })
                      }
                    })
                    successList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} to USB:${vid}|${pid} success.`)
                  }
                } else {
                  errList.push(`Session:${session}|Print bill:${receiptType}|${billInfo} failed: Unsupported hardwareType: ${hardwareType}`)
                }
              } catch (err) {
                errList.push(`Session:${session}|Print Revenue Analysis failed:${err}`)
              }
            }
          }
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
                      } else {
                        device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                          if (writeErr) {
                            errList.push(`Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`)
                          }
                          const waitTime = printTimeMap[vid]
                          await sleep(waitTime)
                          device.close(printEnd)
                        })
=======
      if (toPrintBillContent && toPrintBillContent.length) {
        for (const record of toPrintBillContent) {
          try {
            const { hardwareType, ip, vid, pid, customerContent } = record
            const { isDelivery, statementID, tableCode, takeawayNo, receiverName, attendant, remark } = customerContent
            const isTakeaway = !!takeawayNo
            const billType = isDelivery ? 'Delivery' : isTakeaway ? 'Takeaway' : 'Onsite'
            const billInfo = [statementID, tableCode || takeawayNo || receiverName, attendant, remark].join(':')
            if (hardwareType === 'Network') {
              if (!ip) handler('1', `Print bill:${billType}|${billInfo} to Network failed: ip empty.`)
              else if (net.isIP(ip) !== 4) handler('1', `Print bill:${billType}|${billInfo} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
              else {
                ping.sys.probe(ip, async function (isAlive) {
                  if (!isAlive) handler('1', `Print bill:${billType}|${billInfo} to Network failed: ip:${ip} failed to connect.`)
                  else {
                    await print(buildBill(customerContent), `-d ${ip} -l zh`)
                    handler('0', `Print bill:${billType}|${billInfo} to Network:${ip} success.`)
                  }
                })
              }
            } else if (hardwareType === 'USB') {
              if (!hasUsbPrinters) handler('1', `Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed: USB Printers Not Found`)
              else {
                const commands = await print(buildBill(customerContent), `-l zh`)
                const device = new USB(vid, pid)
                device.open((err) => {
                  if (err) handler('1', `Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device open failed: ${err}.`)
                  else {
                    device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                      if (writeErr) handler('1', `Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`, () => device.close(next))
                      else {
                        const waitTime = printTimeMap[pid]
                        await sleep(waitTime)
                        handler('0', `Print bill:${billType}|${billInfo} to USB:${vid}|${pid} success.`, () => device.close(next))
>>>>>>> 0220cc71d16ec90e9b4e8e4490b6226b756f5d26
                      }
                    })
                  }
                })
              }
            } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print bill:${billType}|${billInfo}: ignore hardwareType ${hardwareType}`)
            else handler('1', `Print bill:${billType}|${billInfo} failed: Unsupported hardwareType: ${hardwareType}`)
          } catch (err) {
            handler('1', `Print bill failed: ${err.message}`)
          }
        }
      }

      if (toPrintOrderContent && toPrintOrderContent.length) {
        for (const record of toPrintOrderContent) {
          try {
            const { hardwareType, ip, vid, pid, chefContent } = record
            if (!chefContent.length) handler('1', `chefContent empty.`)
            else {
              const { tableCode, takeawayNo, statementID, attendant, remark } = chefContent[0]
              const orderInfo = ['Order Info', chefContent.length, statementID, tableCode || takeawayNo || `Delivery`, attendant, remark, chefContent.map(({ food }) => `${food.name} x ${food.num}`).join('|')].join(':')
              log(orderInfo)
              if (hardwareType === 'Network') {
                if (!ip) handler('1', `Print order to Network failed: ip empty.`)
                else if (net.isIP(ip) !== 4) handler('1', `Print order to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
                else {
                  ping.sys.probe(ip, async function (isAlive) {
                    if (!isAlive) handler('1', `Print order to Network failed: ip:${ip} failed to connect.`)
                    else {
                      const commands = chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n')
                      await print(commands, `-d ${ip} -l zh`)
                      handler('0', `Print order to Network:${ip} success.`)
                    }
                  })
                }
              } else if (hardwareType === 'USB') {
                if (!hasUsbPrinters) handler('1', `Print order to USB:${vid}|${pid} failed: USB Printers Not Found`)
                else {
                  const commands = await print(chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n'), `-l zh`)
                  const device = new USB(vid, pid)
                  device.open((err) => {
                    if (err) handler('1', `Print order to USB:${vid}|${pid} failed: USB device open failed: ${err}`)
                    else {
                      device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                        if (writeErr) handler('1', `Print order to USB:${vid}|${pid} failed: USB device write failed: ${writeErr}`, () => device.close(next))
                        else {
                          const waitTime = printTimeMap[pid]
                          await sleep(waitTime)
                          handler('0', `Print order to USB:${vid}|${pid} success.`, () => device.close(next))
                        }
                      })
                    }
                  })
                }
              } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print order to USB:${vid}|${pid}: ignore hardwareType ${hardwareType}`)
              else handler('1', `Print order to USB:${vid}|${pid} failed: Unsupported hardwareType: ${hardwareType}`)
            }
          } catch (err) {
            handler('1', `Print order failed: ${err.message}`)
          }
        }
      }

      if (toPrintRefundContent && toPrintRefundContent.length) {
        for (const record of toPrintRefundContent) {
          try {
            const { hardwareType, ip, vid, pid, refundContent } = record
            if (hardwareType === 'Network') {
              if (!ip) handler('1', `Print refund to Network failed: ip empty.`)
              else if (net.isIP(ip) !== 4) handler('1', `Print refund to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`)
              else {
                ping.sys.probe(ip, async function (isAlive) {
                  if (!isAlive) handler('1', `Print refund to Network failed: ip:${ip} failed to connect.`)
                  else {
                    await print(buildRefund(refundContent), `-d ${ip} -l zh`)
                    handler('0', `Print refund to Network:${ip} success.`)
                  }
                })
              }
            } else if (hardwareType === 'USB') {
              if (!hasUsbPrinters) handler('1', `Print refund to USB:${vid}|${pid} failed: USB Printers Not Found`)
              else {
                const commands = await print(buildRefund(refundContent), `-l zh`)
                const device = new USB(vid, pid)
                device.open((err) => {
                  if (err) handler('1', `Print refund to USB:${vid}|${pid} failed|USB device open failed: ${err}.`)
                  else {
                    device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                      if (writeErr) handler('1', `Print refund to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`, () => device.close(next))
                      else {
                        const waitTime = printTimeMap[pid]
                        await sleep(waitTime)
                        handler('0', `Print refund to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`, () => device.close(next))
                      }
                    })
                  }
                })
              }
            } else if (OTHER_BRAND.includes(hardwareType)) handler('0', `Print refund: ignore hardwareType ${hardwareType}`)
            else handler('1', `Print refund failed: Unsupported hardwareType: ${hardwareType}`)
          } catch (err) {
            handler('1', `Print refund failed: ${err.message}`)
          }
        }
      }
    } catch (err) {
      const msg = `Print failed: ${err.message}.`
      fail(`Session:${session}|${msg}`)
      next()
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
   * Print main function
   * @param {express.Request} req
   * @param {express.Response} res
   */
  async function onPrint(req, res) {
    const session = Date.now().toString()
    try {
      if (!fs.existsSync(sessionPath)) {
        go(session, req.body, res)
      } else {
        taskList.push(session)
        const watcher = chokidar.watch(sessionPath).on('all', () => {
          if (readSession() === session) {
            go(session, req.body, res)
            watcher.close()
          }
        })
      }
    } catch (err) {
      const msg = `Print failed: ${err.message}.`
      fail(`Session:${session}|${msg}`)
      next()
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
    log(`////////// ${name} ${version} Started //////////`)

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
    next()
  }

  /**
   * Error handling function for app listener
   * @param {Error} err
   */
  function onError(err) {
    fail(`${err.code}: Port 2000 already in use(端口已启用或被占用)`, { details: err.message })
    next()
  }

  app.post('/print', onPrint)
  app.listen(2000, onListen).on('error', onError)
} catch (err) {
  fail(err)
  next()
}

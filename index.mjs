#!/usr/bin/env node

import USB from './lib/escpos-usb.mjs'
import print from './src/print.mjs'
import { PRINT_TIME } from './src/constants.mjs'
import { log, done, fail, toHex, buildBill, buildOrder, buildRefund, sleep, getPackageJson } from './src/utils.mjs'

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
   * @property {(import('./src/utils.mjs').ToPrintRefundContent)[]} toPrintRefundContent
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

      const printers = findPrinter()
      const hasUsbPrinters = !!printers.length

      if (!('toPrintBillContent' in body) && !('toPrintOrderContent' in body) && !('toPrintRefundContent' in body)) {
        const msg = `Session:${session}|Print failed: 'toPrintBillContent', 'toPrintOrderContent' and 'toPrintRefundContent' not in the body.`
        fail(msg)
        next()
        return send('1', msg)
      }

      const { toPrintBillContent, toPrintOrderContent, toPrintRefundContent } = body
      if (!(toPrintBillContent && toPrintBillContent.length) && !(toPrintOrderContent && toPrintOrderContent.length) && !(toPrintRefundContent && toPrintRefundContent.length)) {
        const msg = `Session:${session}|Print failed: 'toPrintBillContent', 'toPrintOrderContent' and 'toPrintRefundContent' empty.`
        fail(msg)
        next()
        return send('1', msg)
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
              if (!ip) {
                const msg = `Session:${session}|Print bill:${billType}|${billInfo} to Network failed: ip empty.`
                fail(msg)
                next()
                send('1', msg)
              } else if (net.isIP(ip) !== 4) {
                const msg = `Session:${session}|Print bill:${billType}|${billInfo} to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`
                fail(msg)
                next()
                send('1', msg)
              } else {
                ping.sys.probe(ip, async function (isAlive) {
                  if (!isAlive) {
                    const msg = `Session:${session}|Print bill:${billType}|${billInfo} to Network failed: ip:${ip} failed to connect.`
                    fail(msg)
                    send('1', msg)
                  } else {
                    await print(buildBill(customerContent), `-d ${ip} -l zh`)
                    const msg = `Session:${session}|Print bill:${billType}|${billInfo} to Network:${ip} success.`
                    done(msg)
                    send('0', msg)
                  }
                  next()
                })
              }
            } else if (hardwareType === 'USB') {
              if (!hasUsbPrinters) {
                const msg = `Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed: USB Printers Not Found`
                fail(msg)
                next()
                send('1', msg)
              } else {
                const commands = await print(buildBill(customerContent), `-l zh`)
                const device = new USB(vid, pid)
                device.open((err) => {
                  if (err) {
                    const msg = `Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device open failed: ${err}.`
                    fail(msg)
                    next()
                    send('1', msg)
                  } else {
                    device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                      if (writeErr) {
                        const msg = `Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`
                        fail(msg)
                        send('1', msg)
                      } else {
                        const waitTime = printTimeMap[pid]
                        await sleep(waitTime)
                        const msg = `Session:${session}|Print bill:${billType}|${billInfo} to USB:${vid}|${pid} success.`
                        done(msg)
                        send('0', msg)
                      }
                      device.close(next)
                    })
                  }
                })
              }
            } else {
              const msg = `Session:${session}|Print bill:${billType}|${billInfo} failed: Unsupported hardwareType: ${hardwareType}`
              fail(msg)
              next()
              send('1', msg)
            }
          } catch (err) {
            const msg = `Session:${session}|Print bill failed: ${err.message}`
            fail(msg)
            next()
            send('1', msg)
          }
        }
      }

      if (toPrintOrderContent && toPrintOrderContent.length) {
        for (const record of toPrintOrderContent) {
          try {
            const { hardwareType, ip, vid, pid, chefContent } = record
            if (!chefContent.length) {
              const msg = `Session:${session}|chefContent empty.`
              fail(msg)
              next()
              send('1', msg)
            } else {
              const { tableCode, takeawayNo, statementID, attendant, remark } = chefContent[0]
              const orderInfo = ['Order Info', chefContent.length, statementID, tableCode || takeawayNo || `Delivery`, attendant, remark, chefContent.map(({ food }) => `${food.name} x ${food.num}`).join('|')].join(':')
              if (hardwareType === 'Network') {
                if (!ip) {
                  const msg = `Session:${session}|Print order to Network failed: ip empty.`
                  fail(msg)
                  next()
                  send('1', msg)
                } else if (net.isIP(ip) !== 4) {
                  const msg = `Session:${session}|Print order to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`
                  fail(msg)
                  next()
                  send('1', msg)
                } else {
                  ping.sys.probe(ip, async function (isAlive) {
                    if (!isAlive) {
                      const msg = `Session:${session}|Print order to Network failed: ip:${ip} failed to connect.`
                      fail(msg)
                      send('1', msg)
                    } else {
                      const commands = chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n')
                      await print(commands, `-d ${ip} -l zh`)
                      const msg = `Session:${session}|Print order to Network:${ip} success.`
                      done(msg)
                      log(orderInfo)
                      send('0', msg)
                    }
                    next()
                  })
                }
              } else if (hardwareType === 'USB') {
                if (!hasUsbPrinters) {
                  const msg = `Session:${session}|Print order to USB:${vid}|${pid} failed: USB Printers Not Found`
                  fail(msg)
                  log(orderInfo)
                  next()
                  send('1', msg)
                } else {
                  const commands = await print(chefContent.map((orderCustomContent) => buildOrder(orderCustomContent)).join('=\n'), `-l zh`)
                  const device = new USB(vid, pid)
                  device.open((err) => {
                    if (err) {
                      const msg = `Session:${session}|Print order to USB:${vid}|${pid} failed: USB device open failed: ${err}`
                      fail(msg)
                      log(orderInfo)
                      next()
                      send('1', msg)
                    } else {
                      device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                        if (writeErr) {
                          fail(`Session:${session}|Print order to USB:${vid}|${pid} failed: USB device write failed: ${writeErr}`)
                          log(orderInfo)
                        } else {
                          const waitTime = printTimeMap[pid]
                          await sleep(waitTime)
                          const msg = `Session:${session}|Print order to USB:${vid}|${pid} success.`
                          done(msg)
                          log(orderInfo)
                          send('0', msg)
                        }
                        device.close(next)
                      })
                    }
                  })
                }
              } else {
                const msg = `Session:${session}|Print order to USB:${vid}|${pid} failed: Unsupported hardwareType: ${hardwareType}`
                fail(msg)
                log(orderInfo)
                next()
                send('1', msg)
              }
            }
          } catch (err) {
            const msg = `Session:${session}|Print order failed: ${err.message}`
            fail(msg)
            next()
            send('1', msg)
          }
        }
      }

      if (toPrintRefundContent && toPrintRefundContent.length) {
        for (const record of toPrintRefundContent) {
          try {
            const { hardwareType, ip, vid, pid, refundContent } = record
            if (hardwareType === 'Network') {
              if (!ip) {
                const msg = `Session:${session}|Print refund to Network failed: ip empty.`
                fail(msg)
                next()
                send('1', msg)
              } else if (net.isIP(ip) !== 4) {
                const msg = `Session:${session}|Print refund to Network failed: ip:${ip} incorrect, should be IPv4 format like: 1.1.1.1.`
                fail(msg)
                next()
                send('1', msg)
              }
              ping.sys.probe(ip, async function (isAlive) {
                if (!isAlive) {
                  const msg = `Session:${session}|Print refund to Network failed: ip:${ip} failed to connect.`
                  fail(msg)
                  send('1', msg)
                } else {
                  await print(buildRefund(refundContent), `-d ${ip} -l zh`)
                  const msg = `Session:${session}|Print refund to Network:${ip} success.`
                  done(msg)
                  send('0', msg)
                }
                next()
              })
            } else if (hardwareType === 'USB') {
              if (!hasUsbPrinters) {
                const msg = `Session:${session}|Print refund to USB:${vid}|${pid} failed: USB Printers Not Found`
                fail(msg)
                next()
                send('1', msg)
              } else {
                const commands = await print(buildRefund(refundContent), `-l zh`)
                const device = new USB(vid, pid)
                device.open((err) => {
                  if (err) {
                    const msg = `Session:${session}|Print refund to USB:${vid}|${pid} failed|USB device open failed: ${err}.`
                    fail(msg)
                    next()
                    send('1', msg)
                  } else {
                    device.write(Buffer.from(commands, 'binary'), async (writeErr) => {
                      if (writeErr) {
                        const msg = `Session:${session}|Print refund to USB:${vid}|${pid} failed|USB device write failed: ${writeErr}.`
                        fail(msg)
                        send('1', msg)
                      } else {
                        const waitTime = printTimeMap[pid]
                        await sleep(waitTime)
                        const msg = `Session:${session}|Print refund to USB:${vid}|${pid} success.`
                        done(msg)
                        send('0', msg)
                      }
                      device.close(next)
                    })
                  }
                })
              }
            } else {
              const msg = `Session:${session}|Print refund failed: Unsupported hardwareType: ${hardwareType}`
              fail(msg)
              next()
              send('1', msg)
            }
          } catch (err) {
            const msg = `Session:${session}|Print refund failed: ${err.message}`
            fail(msg)
            next()
            send('1', msg)
          }
        }
      }
    } catch (err) {
      const msg = `Print failed: ${err.message}.`
      fail(msg)
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
      fail(msg)
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

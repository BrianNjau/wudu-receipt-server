import os from 'node:os'
import EventEmitter from 'node:events'
import { usb, getDeviceList, findByIds } from 'usb'

import { log } from '../src/utils.mjs'

/**
 * [USB Class Codes]
 * @type {Object}
 * @docs http://www.usb.org/developers/defined_class
 */
const IFACE_CLASS = {
  AUDIO: 0x01,
  HID: 0x03,
  PRINTER: 0x07,
  HUB: 0x09,
}

export default class USB extends EventEmitter {
  /**
   * @param {number | string} vid
   * @param {number | string} pid
   * @returns {USB}
   */
  constructor(vid, pid) {
    super()
    let self = this
    this.device = null
    if (vid && pid) {
      this.device = findByIds(Number(vid), Number(pid))
    } else {
      let devices = USB.findPrinter()
      if (devices && devices.length) this.device = devices[0]
    }
    if (!this.device) throw new Error(`Can not find printer:${vid}|${pid}`)

    usb.on('detach', function (device) {
      if (device == self.device) {
        self.emit('detach', device)
        self.emit('disconnect', device)
        self.device = null
      }
    })

    return this
  }
  /**
   * @returns {usb.Device[] | false}
   */
  static findPrinter() {
    return getDeviceList().filter(function (device) {
      try {
        return device.configDescriptor?.interfaces.filter(function (iface) {
          return iface.filter(function (conf) {
            return conf.bInterfaceClass === IFACE_CLASS.PRINTER
          }).length
        }).length
      } catch (e) {
        // console.warn(e)
        return false
      }
    })
  }
  /**
   * @param {number | string} vid
   * @param {number | string} pid
   * @returns {Promise<usb.Device>}
   */
  static getDevice(vid, pid) {
    return new Promise((resolve, reject) => {
      try {
        const device = findByIds(Number(vid), Number(pid))
        device?.open()
        resolve(device)
      } catch (err) {
        reject(err)
      }
    })
  }
  /**
   * @param {((error: Error | null) => void) | undefined} [callback]
   * @returns {USB}
   */
  open(callback) {
    let self = this
    let counter = 0
    this.device.open()
    this.device.interfaces.forEach(function (iface) {
      iface.setAltSetting(iface.altSetting, () => {
        try {
          // http://libusb.sourceforge.net/api-1.0/group__dev.html#gab14d11ed6eac7519bb94795659d2c971
          // libusb_kernel_driver_active / libusb_attach_kernel_driver / libusb_detach_kernel_driver : "This functionality is not available on Windows."
          if ('win32' !== os.platform()) {
            if (iface.isKernelDriverActive()) {
              try {
                iface.detachKernelDriver()
              } catch (e) {
                console.error('[ERROR] Could not detatch kernel driver: %s', e)
              }
            }
          }
          iface.claim() // must be called before using any endpoints of this interface.
          iface.endpoints.filter(function (endpoint) {
            if (endpoint.direction == 'out' && !self.endpoint) {
              self.endpoint = endpoint
            }
            if (endpoint.direction == 'in' && !self.deviceToPcEndpoint) {
              self.deviceToPcEndpoint = endpoint
            }
          })
          if (self.endpoint) {
            self.emit('connect', self.device)
            callback && callback(null)
          } else if (++counter === self.device.interfaces.length && !self.endpoint) {
            callback && callback(new Error('Can not find endpoint from printer'))
          }
        } catch (err) {
          // Try/Catch block to prevent process from exit due to uncaught exception.
          // i.e LIBUSB_ERROR_ACCESS might be thrown by claim() if USB device is taken by another process
          // example: MacOS Parallels
          callback && callback(err)
        }
      })
    })
    return this
  }
  /**
   * @param {((data: Buffer) => void) | undefined} [callback]
   */
  read(callback) {
    this.deviceToPcEndpoint.transfer(
      64,
      /**
       * @param {*} error
       * @param {Buffer} data
       */ (error, data) => {
        callback && callback(data)
      },
    )
  }
  /**
   * @param {string | Buffer} data
   * @param {((error: Error | null) => void) | undefined} [callback]
   * @returns {USB}
   */
  write(data, callback) {
    this.emit('data', data)
    this.endpoint.transfer(data, callback)
    return this
  }
  /**
   * @param {string | Buffer} data
   * @returns {Promise<undefined>}
   */
  async writeSync(data) {
    return new Promise((resolve, reject) => {
      try {
        this.emit('data', data)
        this.endpoint.transfer(data, (err) => {
          if (err) reject(err)
          else resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }
  /**
   * @param {((error: Error | null) => void) | undefined} [callback]
   * @returns {USB}
   */
  close(callback) {
    if (!this.device) {
      log(`escpos-usb: No device`, { prefix: '[ERROR]' })
      if (typeof callback === 'function') callback()
    } else {
      try {
        this.device.close()
        usb.removeAllListeners('detach')
        if (typeof callback === 'function') callback()
        this.emit('close', this.device)
      } catch (err) {
        if (typeof callback === 'function') callback(err)
        log(`escpos-usb: ${err ? err.message || err.name : 'error catched.'}`, { prefix: '[ERROR]', skip: true })
      }
    }
    return this
  }
  async closeSync() {
    return new Promise((resolve, reject) => {
      if (!this.device) {
        const reason = `escpos-usb: No device`
        log(reason, { prefix: '[ERROR]' })
        reject(reason)
      } else {
        try {
          this.device.close()
          usb.removeAllListeners('detach')
          this.emit('close', this.device)
          resolve()
        } catch (err) {
          const reason = `escpos-usb: ${err ? err.message || err.name : 'error catched.'}`
          log(reason, { prefix: '[ERROR]', skip: true })
          reject(reason)
        }
      }
    })
  }
}

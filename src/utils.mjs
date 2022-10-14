import fs from 'node:fs'
import path from 'node:path'
import numeral from 'numeral'

import { PRICE } from './constants.mjs'

/**
 * 获取某个文件的大小（mb）
 * https://stackoverflow.com/questions/42363140/how-to-find-the-size-of-the-file-in-node-js
 * @param {string} fileName 文件名
 */
export function getFileSizeInMegaBytes(fileName) {
  if (fs.existsSync(fileName)) {
    const stats = fs.statSync(fileName)
    const fileSizeInBytes = stats['size']
    const fileSizeInMegabytes = fileSizeInBytes / 1000000.0
    return fileSizeInMegabytes
  }
  return 0
}

/**
 * 文件大小大于 1MB 则删除该文件
 * @param {string} fileName 文件名
 * @param {number} [megaBytes] 文件大小，默认 1 MB
 */
export function unlinkFileIfSizeOver(fileName, megaBytes = 1) {
  const fileSizeInMegabytes = getFileSizeInMegaBytes(fileName)
  if (fileSizeInMegabytes > megaBytes) {
    fs.unlinkSync(fileName)
  }
}

/**
 * Log function
 * @param {string} str Log string
 * @param {{ prefix: string; details: string; skip: boolean }} [param1] Extra params
 */
export const log = (str, { prefix = '', details = '', skip } = {}) => {
  const logPath = path.join(process.cwd(), './app.log')
  const time = new Date().toLocaleString()
  unlinkFileIfSizeOver(logPath)
  fs.appendFileSync(logPath, `[${time}] ${prefix}${JSON.stringify(`${str}${details && `|${details}`}`)}\n\n`)
  if (!skip) console.log(`[${time}] ${prefix}${str}`)
}

/**
 * Transform number-like string to hex output
 * @param {string} str Number-like string to hex output
 * @returns {string}
 */
export const toHex = (str) => str.toString(16).padStart(4, '0')

/**
 * Escape special characters
 * @param {string} str
 * @returns {string}
 */
export const escapeChars = (str) => str.replaceAll(/_/g, '\\_')

/**
 * Transform number-like to number
 * @param {string | number} str Number-like string or number
 * @returns number
 */
export const n = (str) => numeral(str).value() || 0

/**
 * Transform number-like price to formatted price
 * @param {string | number} str Number-like string or number
 * @returns string
 */
export const f = (str) => numeral(str).format(PRICE)

/**
 * @public
 * @typedef Food
 * @property {string} modifier
 * @property {string} name
 * @property {string} num
 * @property {string} [price] Bill
 */

/**
 * @public
 * @typedef NormalizedFood
 * @property {string} modifier
 * @property {string} name
 * @property {number} num
 * @property {number} [price] Bill
 */

/**
 * @public
 * @typedef BillCustomContent
 * @property {string} address
 * @property {string} createdDate
 * @property {Food[]} foodList
 * @property {boolean} isDelivery
 * @property {string} logo
 * @property {string} remark
 * @property {string} shopName
 * @property {string} statementID
 * @property {string} tableCode
 * @property {string} totalPrice
 * @property {string} [tipsFee]
 * @property {string} [discount]
 * @property {string} [attendant] Onsite
 * @property {string} [customerNum] Onsite
 * @property {string} [city] Takeway or Delivery
 * @property {string} [province] Takeway or Delivery
 * @property {string} [takeawayNo] Takeway
 * @property {string} [deliveryFee] Delivery
 * @property {string} [receiverAdress] Delivery
 * @property {string} [receiverName] Delivery
 * @property {string} [receiverPhone] Delivery
 */

/**
 * @public
 * @typedef OrderCustomContent
 * @property {string} createdDate
 * @property {Food} food
 * @property {boolean} isDelivery
 * @property {string} remark
 * @property {string} statementID
 * @property {string} [attendant] Onsite
 * @property {string} [catalogId] Onsite
 * @property {string} [tableCode] Onsite
 * @property {string | null} [takeawayNo] Takeway or Delivery
 * @property {string | null} [receiverName] Takeway or Delivery
 */

/**
 * @public
 * @typedef ToPrintBillContent
 * @property {BillCustomContent} customerContent
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
 */

/**
 * @public
 * @typedef ToPrintOrderContent
 * @property {OrderCustomContent[]} chefContent
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
 */

/**
 * Build bill print content
 * @param {BillCustomContent} billCustomContent
 */
export const buildBill = (billCustomContent) => {
  const { isDelivery, takeawayNo, address, shopName, attendant, deliveryFee, tipsFee, discount, totalPrice, foodList, createdDate, statementID, remark, tableCode, receiverAdress, receiverName, receiverPhone } = billCustomContent

  const isTakeaway = !!takeawayNo

  const HEADER = `"^${shopName}\n\n${address}\n\n`

  let SUB_HEADER = ''
  if (!isDelivery && !isTakeaway) {
    // Onsite - 堂食
    SUB_HEADER = `"^TABLE ${tableCode}\n-\n`
  } else if (isTakeaway) {
    // Takeway - 自取
    SUB_HEADER = `"^TAKEWAY NO. ${takeawayNo}\n-\n`
  } else if (isDelivery) {
    // Delivery - 外卖
    SUB_HEADER = `"^DELIVERY\n-\n`
  }

  const deliveryFeeMd = deliveryFee ? `Delivery Fee | "^${deliveryFee}\n` : ''
  const tipsFeeMd = tipsFee ? `^Tips | "^${tipsFee}\n` : ''
  const discountMd = discount ? `^Discount | "^${discount}\n` : ''
  /** @type {NormalizedFood[]} */
  const normalizedFoodList = []
  foodList.forEach((food) => {
    const normalizedFood = normalizedFoodList.find((record) => record.name === food.name)
    if (normalizedFood) {
      normalizedFood.num += n(food.num)
    } else {
      normalizedFoodList.push({
        ...food,
        num: n(food.num),
        price: n(food.price),
      })
    }
  })
  const FOOD_TABLE = `|Name | Qty | Price | Total|\n-
${normalizedFoodList.map(({ name, modifier, num, price }) => `|${name} |\n${modifier ? `|[${modifier}] |\n` : ''}|| ${num} | ${f(price)} | "${f(n(num) * n(price))}|`).join('\n')}
-\n${deliveryFeeMd}${tipsFeeMd}${discountMd}^TOTAL | "^${totalPrice}\n-\n`

  const statementIDMd = statementID ? `Order No.: |${statementID}\n` : ''
  const attendantMd = attendant ? `Attendant: |${escapeChars(attendant)}\n` : ''
  const createdDateMd = createdDate ? `Date Time: |${createdDate}\n` : ''
  const receiverNameMd = receiverName ? `Receiver: |${escapeChars(receiverName)}\n` : ''
  const receiverPhoneMd = receiverPhone ? `Phone No.: |${receiverPhone}\n` : ''
  const receiverAdressMd = receiverAdress ? `Address: |${receiverAdress}\n` : ''
  const remarkMd = remark ? `Remark: |${remark}\n` : ''
  const FOOTER = `{w:10,*}\n${statementIDMd}${attendantMd}${createdDateMd}${receiverNameMd}${receiverPhoneMd}${receiverAdressMd}${remarkMd}{w:auto}\n-\n\n`

  return HEADER + SUB_HEADER + FOOD_TABLE + FOOTER
}

/**
 * Build bill print content
 * @param {OrderCustomContent} orderCustomContent
 */
export const buildOrder = (orderCustomContent) => {
  const { isDelivery, takeawayNo, tableCode, food, attendant, createdDate, statementID, receiverName, remark } = orderCustomContent
  const isTakeaway = !!takeawayNo

  let SUB_HEADER = ''
  if (!isDelivery && !isTakeaway) {
    // Onsite - 堂食
    SUB_HEADER = `"^TABLE ${tableCode}\n-\n`
  } else if (isTakeaway) {
    // Takeway - 自取
    SUB_HEADER = `"^TAKEWAY NO. ${takeawayNo}\n-\n`
  } else if (isDelivery) {
    // Delivery - 外卖
    SUB_HEADER = `"^DELIVERY\n-\n`
  }

  const FOOD_TABLE = `{w:6,*}\n|Qty |Name |\n-\n|^^^${food.num} |^^^${food.name} |${food.modifier ? `\n||^^^[${food.modifier}] |` : ''}\n{w:auto}\n-\n`

  const statementIDMd = statementID ? `Order No.: |${statementID}\n` : ''
  const attendantMd = attendant ? `Attendant: |${escapeChars(attendant)}\n` : ''
  const createdDateMd = createdDate ? `Date Time: |${createdDate}\n` : ''
  const receiverNameMd = receiverName ? `Receiver: |${escapeChars(receiverName)}\n` : ''
  const remarkMd = remark ? `Remark: |${remark}\n` : ''
  const FOOTER = `{w:10,*}\n${statementIDMd}${attendantMd}${createdDateMd}${receiverNameMd}${remarkMd}{w:auto}\n-\n`

  return SUB_HEADER + FOOD_TABLE + FOOTER
}

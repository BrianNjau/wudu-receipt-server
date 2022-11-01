import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
  fs.appendFileSync(logPath, `[${time}] ${prefix}${JSON.stringify(`${str}${details && `|${details}`}`)}\n`)
  if (!skip) console.log(`[${time}] ${prefix}${str}`)
}

export const done = (str, { details = '', skip } = {}) => log(str, { prefix: '[SUCCESS]', details, skip })
export const fail = (str, { details = '', skip } = {}) => log(str, { prefix: '[ERROR]', details, skip })

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
 * @typedef RevenueAnalysisContent
 * @property {string} address
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} logo
 * @property {string} shopName
 * @property {number} totalAmount
 * @property {number} totalOnlinePaymentAmount
 * @property {number} totalCashPaymentAmount
 * @property {number} totalCreditCardAmount
 * @property {number} totalCreditTransactionAmount
 * @property {number} totalDeliveryAmount
 * @property {number} totalDeliveryOrders
 * @property {number} totalDiningInAmount
 * @property {number} totalDiningInOrders
 * @property {number} totalOrders
 * @property {number} totalPersonalTransferAmount
 * @property {number} totalStaffFreeAmount
 * @property {number} totalTakeawayAmount
 * @property {number} totalTakeawayOrders
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
 * @typedef ToPrintRevenueAnalysisContent
 * @property {RevenueAnalysisContent} revenueAnalysis
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
 */

/**
 * @public
 * @typedef ToPrintRefundContent
 * @property {RefundContent} refundContent
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
 */

/**
 * @typedef RefundContent
 * @property {string} createdDate
 * @property {Food} food
 * @property {string} attendant Onsite
 * @property {string} tableCode Onsite
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
 * Build receipt revenue analysis content
 * @param {RevenueAnalysisContent} revenueAnalysisContent
 */
export const buildRevenueAnalysis = (revenueAnalysisContent) => {
  const { address, startDate, endDate, logo, shopName, totalAmount, totalCashPaymentAmount, totalOnlinePaymentAmount, totalCreditCardAmount, totalCreditTransactionAmount, totalDeliveryAmount, totalDeliveryOrders, totalDiningInAmount, totalDiningInOrders, totalOrders, totalPersonalTransferAmount, totalStaffFreeAmount, totalTakeawayAmount, totalTakeawayOrders } = revenueAnalysisContent

  const date = new Date().toISOString().replace('T', ' ').substr(0, 19)

  const avg = totalAmount / totalOrders || 0

  const HEADER = `"^${shopName}\n
            ^Revenue Report
         \n${startDate.split('T')[0]} ${startDate.split('T')[1].split('+')[0]} - ${endDate.split('T')[0]} ${endDate.split('T')[1].split('+')[0]} "`

  const PRINT_DATE_TIME = `\n\n\n Date: ${date.split(' ')[0]} |  Time: ${date.split(' ')[1]}\n-\n `

  const TOTALS = `\n Total Amount | ${totalAmount} \n\n Total Orders | ${totalOrders} \n-\n`

  const ORDER_TYPE_REPORT = `\n ^Order Type Report 
   \n\n Dining in Amount | ${totalDiningInAmount} \n\n Dining in Orders | ${totalDiningInOrders} 
   \n\n Takeaway Amount | ${totalTakeawayAmount} \n\n Takeaway Orders | ${totalTakeawayOrders} 
   \n\n Delivery Amount | ${totalDeliveryAmount} \n\n Delivery Orders | ${totalDeliveryOrders} \n-\n`

  const PAYMENT_TYPE_REPORT = `\n ^Payment Type Report 
    \n\n Online Payment | ${totalOnlinePaymentAmount}  
    \n\n Cash | ${totalCashPaymentAmount}
    \n\n Credit Card | ${totalCreditCardAmount}
    \n\n Personal Transfer | ${totalPersonalTransferAmount} 
    \n\n Credit Transaction | ${totalCreditTransactionAmount} 
    \n\n Staff Free | ${totalStaffFreeAmount} \n-\n`

  const AVERAGES_PER_ORDER = `\n ^Averages Per Order 
   \n\n  Total Amount | ${avg} \n\n`

  return HEADER + PRINT_DATE_TIME + TOTALS + ORDER_TYPE_REPORT + PAYMENT_TYPE_REPORT + AVERAGES_PER_ORDER
}

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
  const FOOTER = `{w:10,*}\n${statementIDMd}${attendantMd}${createdDateMd}${receiverNameMd}${receiverPhoneMd}${receiverAdressMd}${remarkMd}{w:auto}\n-\n`

  return HEADER + SUB_HEADER + FOOD_TABLE + FOOTER
}

/**
 * Build order print content
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

/**
 * Build refund print content
 * @param {RefundContent} refundContent
 */
export const buildRefund = (refundContent) => {
  const { tableCode, food, attendant, createdDate } = refundContent

  let SUB_HEADER = ''
  // Onsite - 堂食
  SUB_HEADER = `"^[REFUND]TABLE ${tableCode}\n-\n`

  const FOOD_TABLE = `{w:6,*}\n|Qty |Name |\n-\n|^^^${food.num} |^^^[REFUND]${food.name} |${food.modifier ? `\n||^^^[${food.modifier}] |` : ''}\n{w:auto}\n-\n`

  const attendantMd = attendant ? `Attendant: |${escapeChars(attendant)}\n` : ''
  const createdDateMd = createdDate ? `Date Time: |${createdDate}\n` : ''
  const FOOTER = `{w:10,*}\n${attendantMd}${createdDateMd}{w:auto}\n-\n`

  return SUB_HEADER + FOOD_TABLE + FOOTER
}

/**
 * Sleep for n ms
 * @param {number} ms
 * @returns {Promise<NodeJS.Timeout>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPackageJson() {
  const currentPath = path.dirname(fileURLToPath(import.meta.url))
  const packageJsonPath = path.join(currentPath, '../package.json')
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
}

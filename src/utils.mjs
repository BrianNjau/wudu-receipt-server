import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setInterval, clearInterval } from 'node:timers'
import ping from 'ping'
import numeral from 'numeral'
import { PRICE, SESSION_PATH } from './constants.mjs'

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
 * @param {{ prefix?: string; details?: string; logFileName?: string; skip?: boolean}} [options] Extra params
 */
export const log = (str, { prefix = '', details = '', logFileName = './app.log', skip } = {}) => {
  const logPath = path.join(process.cwd(), logFileName)
  const time = new Date().toLocaleString()
  unlinkFileIfSizeOver(logPath, 10)
  fs.appendFileSync(logPath, `[${time}] ${prefix}${JSON.stringify(`${str}${details && `|${details}`}`)}\n`)
  if (!skip) console.log(`[${time}] ${prefix}${str}`)
}

export const done = (str, { details = '', logFileName, skip } = {}) => log(str, { prefix: '[DONE]', details, logFileName, skip })
export const fail = (str, { details = '', logFileName, skip } = {}) => log(str, { prefix: '[FAIL]', details, logFileName, skip })

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
 * @typedef removeDishData
 * @property {string} createdDate
 * @property {string[]} attendant
 * @property {number} amount
 * @property {string} operator
 * @property {string} productName
 * @property {number} quantity
 * @property {string} tableCode 
 */
/**
 * @public
 * @typedef OrderReportData
 * @property {string} attendant
 * @property {string} date
 * @property {number} deliveryFee
 * @property {number} discountAmount
 * @property {string} orderNo
 * @property {string} orderType
 * @property {number} totalPrice
 * @property {string} paymentMethod
 * @property {number} totalQuantity
 * @property {string} storeName
 * @property {string} tableNo
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
 * @public
 * @typedef ToPrintRefundContent
 * @property {RefundContent} refundContent
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
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
 * @typedef ToPrintRemoveDishReport
 * @property {removeDishData[]} removeDishData
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
 */
/**
 * @public
 * @typedef ToPrintOrderReport
 * @property {OrderReportData[]} orderReportData
 * @property {"Network" | "USB"} hardwareType
 * @property {string} [ip]
 * @property {string} [vid]
 * @property {string} [pid]
 */

/**
 * Build bill print content
 * @param {OrderReportData} orderReportData
 */
export const buildOrderReport = (orderReportData, store, startDate, endDate) => {

  const curdate = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const PRINT_DATE_TIME = `\n\n\n Date: ${curdate.split(' ')[0]} |  Time: ${curdate.split(' ')[1]}\n-\n `
  const HEADER = `"^${store}\n\n^Order Report\n\n${startDate.split('T')[0]} ${startDate.split('T')[1].split('+')[0]} - ${endDate.split('T')[0]} ${endDate.split('T')[1].split('+')[0]}"`
  const total = orderReportData.map((a) => a.totalPrice).reduce((prev,next) => prev + next);
  const totalCashAmount = orderReportData.filter((a) => a.paymentMethod == 'Cash').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);
  const totalCouponAmount = orderReportData.filter((a) => a.paymentMethod == 'Coupon').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);
  const totalMPESAOfflineAmount = orderReportData.filter((a) => a.paymentMethod == 'MPESAOffline').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);
  const totalCreditCardAmount = orderReportData.filter((a) => a.paymentMethod == 'CreditCard').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);
  const totalPersonalTransferAmount = orderReportData.filter((a) => a.paymentMethod == 'PersonalTransfer').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);
  const totalCreditTransactionAmount = orderReportData.filter((a) => a.paymentMethod == 'CreditTransaction').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);
  const totalStaffFreeAmount = orderReportData.filter((a) => a.paymentMethod == 'StaffFree').map((a) => a.totalPrice).reduce((prev,next) => prev + next,0);



  const ORDER_TABLE = `|Date | Table | Paid | Price | Disc | Actual|\n-
  ${orderReportData.map(({orderNo, date, tableNo, paymentMethod,originalPrice ,totalQuantity, discountAmount, totalPrice } ) => `| ${date.split(' ')[0]} | ${tableNo ? ` ${tableNo} ` : '-'} | ${paymentMethod} | ${f(originalPrice)} | ${f(discountAmount)} | "${f(totalPrice)}|`).join('\n')}
 -\n^TOTAL | "^${total} `
  const printCashAmount = totalCashAmount?`\n\nCash Amount: | ${totalCashAmount}`:'';
  const printCouponAmount = totalCouponAmount?`\n\nCoupon Amount: | ${totalCouponAmount}`:'';
  const printTotalMPESAOfflineAmount = totalMPESAOfflineAmount?`\n\nOffline Mpesa: | ${totalMPESAOfflineAmount}`:'';
  const printTotalCreditCardAmount = totalCreditCardAmount?`\n\nCredit Card: | ${totalCreditCardAmount}`:'';
  const printTotalPersonalTransferAmount = totalPersonalTransferAmount?`\n\nPersonal Transfer: | ${totalPersonalTransferAmount}`:'';
  const printTotalCreditTransactionAmount = totalCreditTransactionAmount?`\n\nCredit Transaction: | ${totalCreditTransactionAmount}`:'';
  const printTotalStaffFreeAmount = totalStaffFreeAmount?`\n\nStaff Free: | ${totalStaffFreeAmount}`:'';
 
  // const KICKDRAWER = statementID ?`{command:\x1b\x70\x00\x19\xfa}`:'';
  return HEADER + PRINT_DATE_TIME + ORDER_TABLE + printCashAmount + printCouponAmount + printTotalMPESAOfflineAmount + printTotalCreditCardAmount + printTotalPersonalTransferAmount + printTotalCreditTransactionAmount + printTotalStaffFreeAmount + `\n\n`; 
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
    const normalizedFood = normalizedFoodList.find((record) => record.name === food.name && record.modifier === food.modifier)
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
${normalizedFoodList.map(({ name, modifier, num, price }) => `|${name} |\n${modifier ? `|[${ modifier}] |\n` : ''}|| ${num} | ${f(price)} | "${f(n(num) * n(price))}|`).join('\n')}
-\n${deliveryFeeMd}${tipsFeeMd}${discountMd}^TOTAL | "^${totalPrice}\n-\n`

  const statementIDMd = statementID ? `Order No.: |${statementID}\n` : ''
  const attendantMd = attendant ? `Attendant: |${escapeChars(attendant)}\n` : ''
  const createdDateMd = createdDate ? `Date Time: |${createdDate}\n` : ''
  const receiverNameMd = receiverName ? `Receiver: |${escapeChars(receiverName)}\n` : ''
  const receiverPhoneMd = receiverPhone ? `Phone No.: |${receiverPhone}\n` : ''
  const receiverAdressMd = receiverAdress ? `Address: |${receiverAdress}\n` : ''
  const remarkMd = remark ? `Remark: |${remark}\n` : ''
  const FOOTER = `{w:10,*}\n${statementIDMd}${attendantMd}${createdDateMd}${receiverNameMd}${receiverPhoneMd}${receiverAdressMd}${remarkMd}{w:auto}\n-\n`
  const KICKDRAWER = statementID ?`{command:\x1b\x70\x00\x19\xfa}`:'';
  return HEADER + SUB_HEADER + FOOD_TABLE + FOOTER +KICKDRAWER
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
 * Build receipt revenue analysis content
 * @param {RevenueAnalysisContent} revenueAnalysisContent
 */
export const buildRevenueAnalysis = (revenueAnalysisContent) => {
  const { startDate, endDate, shopName, totalAmount, totalCashPaymentAmount, totalOnlinePaymentAmount, totalCreditCardAmount, totalCreditTransactionAmount, totalDeliveryAmount, totalDeliveryOrders, totalDiningInAmount, totalDiningInOrders, totalOrders, totalPersonalTransferAmount, totalStaffFreeAmount, totalTakeawayAmount, totalTakeawayOrders } = revenueAnalysisContent

  const date = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const avg = f(totalAmount / totalOrders || 0)

  const HEADER = `"^${shopName}\n
            ^Revenue Report\n
         ${startDate.split('T')[0]} ${startDate.split('T')[1].split('+')[0]} - ${endDate.split('T')[0]} ${endDate.split('T')[1].split('+')[0]}"`

  const PRINT_DATE_TIME = `\n\n\n Date: ${date.split(' ')[0]} |  Time: ${date.split(' ')[1]}\n-\n `

  const TOTALS = `\n Total Amount | ${totalAmount} \n\n Total Orders | ${totalOrders} \n-\n`

  const ORDER_TYPE_REPORT = `\n ^Order Type Report 


    Dining in Amount | ${totalDiningInAmount}

    Dining in Orders | ${totalDiningInOrders} 


    Takeaway Amount | ${totalTakeawayAmount}

    Takeaway Orders | ${totalTakeawayOrders} 


    Delivery Amount | ${totalDeliveryAmount}

    Delivery Orders | ${totalDeliveryOrders}

    -\n`

  const PAYMENT_TYPE_REPORT = `\n ^Payment Type Report


    Online Payment | ${totalOnlinePaymentAmount}

    Cash | ${totalCashPaymentAmount}

    Credit Card | ${totalCreditCardAmount}

    Personal Transfer | ${totalPersonalTransferAmount}

    Credit Transaction | ${totalCreditTransactionAmount}

    Staff Free | ${totalStaffFreeAmount}

    -\n`

  const AVERAGES_PER_ORDER = `\n ^Averages Per Order 
   \n\n  Total Amount | ${avg} \n\n`

  return HEADER + PRINT_DATE_TIME + TOTALS + ORDER_TYPE_REPORT + PAYMENT_TYPE_REPORT + AVERAGES_PER_ORDER
}


/**
 * Build receipt revenue analysis content
 * @param {ToPrintRemoveDishReport} removeDishData
 */
export const buildRemoveDishes = (removeDishData, store, totalAmount, totalQuantity , startDate , endDate) => {


  const HEADER = `"^VOID DISH REPORT \n\n  ${startDate?.split('T')[0]} ${startDate?.split('T')[1].split('+')[0]} - ${endDate?.split('T')[0]} ${endDate?.split('T')[1].split('+')[0]}`

  const date = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const PRINT_DATE_TIME = `\n\n\n Date: ${date.split(' ')[0]} |  Time: ${date.split(' ')[1]}\n-\n `

  const removeDishTable = `|"Table | "Dish | "Qty | "Amount |\n-
${removeDishData.map(({amount, productName, quantity, tableCode}) => `| ${tableCode} | ${productName} | "${quantity} | "${amount}`).join('\n')}
- 

|^TOTAL | ^"${totalQuantity}| ^"${totalAmount}|\n-\n

`


  return HEADER + PRINT_DATE_TIME + removeDishTable

}




/**
 * Sleep for n ms
 * @param {number} ms
 * @returns {Promise<NodeJS.Timeout>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get package.json as JSON
 * @returns {Object} Contents of package.json
 */
export function getPackageJson() {
  const currentPath = path.dirname(fileURLToPath(import.meta.url))
  const packageJsonPath = path.resolve(currentPath, '../package.json')
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
}

export class IPListener {
  /**
   * Listening ip list
   * @type {string[]}
   */
  ipList = []

  /**
   * Ping interval ms
   */
  timeout = 10 * 1000

  /**
   * Listen to ip list and log failed cases
   */
  listener = () => {
    if (this.ipList.length) {
      this.ipList.forEach((ip) => {
        ping.sys.probe(ip, (isAlive) => {
          if (!isAlive) fail(`IP:${ip} cannot ping(无法连接).`, { logFileName: 'ping.log' })
        })
      })
    }
  }

  /**
   * Push an ip to the list
   * @param {string} ip
   */
  push = (ip) => {
    if (!this.ipList.includes(ip)) {
      this.ipList.push(ip)
      if (this.interval) clearInterval(this.interval)
      this.interval = setInterval(this.listener, this.timeout)
    }
  }
}

export class TaskQueue {
  /**
   * Queueing printing task list
   * @type {string[]}
   */
  taskList = []

  /**
   * Push a new session id to the task list
   * @param {string} newSession New session id
   */
  push = (newSession) => {
    this.taskList.push(newSession)
  }

  /**
   * Start next task
   */
  next = () => {
    if (fs.existsSync(SESSION_PATH)) {
      if (this.taskList.length) {
        fs.writeFileSync(SESSION_PATH, this.taskList.shift())
      } else {
        fs.unlinkSync(SESSION_PATH)
      }
    }
  }

  /**
   * Get the current session
   * @returns {string} session
   */
  getSession = () => {
    if (fs.existsSync(SESSION_PATH)) {
      return fs.readFileSync(SESSION_PATH, 'utf8')
    } else {
      return ''
    }
  }

  /**
   * Set the current session locally
   * @param {string} session Current session
   */
  setSession = (session) => {
    if (typeof session === 'string' && session.length) fs.writeFileSync(SESSION_PATH, session)
  }
}

import USB from './lib/escpos-usb.mjs'
import print from './src/print.mjs'

const bill = `^^^RECEIPT

${new Date().toLocaleString('zh')}

-
|品名 | 数量 | 单价 | 总价|
-
|苹果 |
|| 1 | 1.00 | "1.00|
|香蕉 |
|| 2 | 2.00 | "4.00|
-
^TOTAL | "^5.00

{code:1234567890; option:code128,2,72,nohri}`
await print(bill, `-d 192.168.1.2 -l zh`)

// USB打印-已调通
const commands = await print(bill, `-l zh`)
const device = new USB()
device.open(() => {
  device.write(Buffer.from(commands, 'binary'), device.close)
})

// 条形码-已调通
// const barcode = `{code:1234567890; option:code128,2,72,nohri}`
// await print(barcode, `-d 192.168.1.2`)

// 二维码-暂未调通
// const qrcode = `{code:https://receiptline.github.io/designer/; option:qrcode}`
// await print(qrcode, `-d 192.168.1.2`)

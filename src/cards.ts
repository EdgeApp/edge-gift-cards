import { Network, payments } from 'altcoin-js'
import ECPairFactory, { ECPairInterface } from 'ecpair'
import { createWriteStream, existsSync, writeFileSync } from 'fs'
import PDFDocument from 'pdfkit'
import * as QRCode from 'qrcode'
import * as ecc from 'tiny-secp256k1'

import { config } from './config'

const dpi = (x: number): number => x * 72 // Points per inch
const outPath = config.cardsFullpath

// Avery label dimensions and page layout
const labelWidth = dpi(2.625) // 2-5/8 inches in points
const labelHeight = dpi(1) // 1 inch in points
const columns = 3 // Number of columns based on label width in an 8.5" document
const rows = 10 // Number of rows per page
const leftPadding = dpi(0.125)
const topPadding = dpi(0.125 / 2)

// Margins and gaps
const leftRightMargin = dpi(3 / 16) // 3/16 inch in points for left and right margins
const topBottomMargin = dpi(0.5) // 1/2 inch in points for top and bottom margins
const columnGap = dpi(1 / 8) // 1/8 inch in points for gap between columns

const ECPair = ECPairFactory(ecc)
const networks: Record<string, Network & { currencyCode: string }> = {
  litecoin: {
    currencyCode: 'ltc',
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
  },
  dogecoin: {
    currencyCode: 'doge',
    messagePrefix: '\x18Dogecoin Signed Message:\n',
    bech32: 'dge',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e
  }
}

// Function to generate Litecoin key pair
function generateKeyPair(networkName: string): ECPairInterface {
  const keyPair = ECPair.makeRandom({ network: networks[networkName] })
  return keyPair
}

// Function to create QR code
async function createQRCode(data: string): Promise<Buffer> {
  try {
    const qrCode = await QRCode.toBuffer(data)
    return qrCode
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

// Main function to generate keys, QR codes, and PDF
async function main(): Promise<void> {
  const networkName = process.argv[2]
  const chosenNetwork = networks[networkName]

  if (chosenNetwork == null) {
    console.error('Invalid network')
    return
  }

  const doc = new PDFDocument({ margin: 0, size: 'LETTER' }) // 8.5" x 11" document

  let fileName: string
  let index = 0
  let fullFilePath: string
  while (true) {
    fileName = `keys-${networkName}-` + index.toString().padStart(4, '0')
    fullFilePath = `${outPath}/${fileName}`
    if (!existsSync(`${fullFilePath}.pdf`)) {
      break
    }
    index++
  }

  const stream = createWriteStream(`${fullFilePath}.pdf`)
  const keysJson: Array<{ pub: string; priv: string }> = []

  doc.pipe(stream)

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const keyPair = generateKeyPair(networkName)
      const privKey: string = keyPair.toWIF()
      if (privKey == null) throw new Error('Private key is null')
      const uri = `edge://pay/${networkName}/${privKey}`
      const privateKeyQR = await createQRCode(uri)

      const { address } = payments.p2pkh({
        network: chosenNetwork,
        pubkey: keyPair.publicKey
      })
      if (address == null) throw new Error('Address is null')
      keysJson.push({ pub: address, priv: privKey })

      const publicKeyQR = await createQRCode(address)

      const x = leftRightMargin + column * (labelWidth + columnGap)
      const y = topBottomMargin + topPadding + row * labelHeight

      // Adjust QR code size if necessary to fit within the label dimensions
      const qrSize = labelHeight * 0.9 // Example to fit both QR codes on one label
      doc.image(privateKeyQR, x + leftPadding, y, { width: qrSize })
      doc.image(publicKeyQR, x + leftPadding + qrSize + dpi(0.5), y, {
        width: qrSize
      })
      const lastFiveDigits = `${chosenNetwork.currencyCode} ${address.slice(
        -5
      )}`
      const textY = y + labelHeight - dpi(0.2)

      doc
        .save()
        .rotate(270, {
          origin: [x + leftPadding + qrSize * 2 + dpi(0.45), textY]
        })
        .fontSize(6)
        .text(lastFiveDigits, x + leftPadding + qrSize * 2 + dpi(0.45), textY)
        .restore()
    }
  }

  doc.end()
  const fileJson = {
    network: networkName,
    keysJson
  }
  writeFileSync(`${fullFilePath}.json`, JSON.stringify(fileJson, null, 2))
}

main().catch(console.error)

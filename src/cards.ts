import { Network, payments } from 'altcoin-js'
import ECPairFactory, { ECPairInterface } from 'ecpair'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { PDFDocument, RotationTypes } from 'pdf-lib'
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
async function createQRCode(data: string): Promise<Uint8Array> {
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

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([dpi(8.5), dpi(11)])

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
  const keysJson: Array<{ pub: string; priv: string }> = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const keyPair = generateKeyPair(networkName)
      const privKey: string = keyPair.toWIF()
      if (privKey == null) throw new Error('Private key is null')
      const uri = `edge://pay/${networkName}/${privKey}`
      const privateKeyQR = await createQRCode(uri)
      const privateKeyImage = await pdfDoc.embedPng(privateKeyQR)

      const { address } = payments.p2pkh({
        network: chosenNetwork,
        pubkey: keyPair.publicKey
      })
      if (address == null) throw new Error('Address is null')
      keysJson.push({ pub: address, priv: privKey })

      const publicKeyQR = await createQRCode(address)
      const publicKeyImage = await pdfDoc.embedPng(publicKeyQR)

      const x = leftRightMargin + column * (labelWidth + columnGap)
      const y =
        page.getHeight() +
        labelHeight -
        (topBottomMargin + topPadding + (row + 1) * labelHeight)

      // Adjust QR code size if necessary to fit within the label dimensions
      const qrSize = labelHeight * 0.9 // Example to fit both QR codes on one label
      page.drawImage(privateKeyImage, {
        x: x + leftPadding,
        y: y - qrSize, // Adjust y position for image placement
        width: qrSize,
        height: qrSize
      })

      page.drawImage(publicKeyImage, {
        x: x + leftPadding + qrSize + dpi(0.5),
        y: y - qrSize, // Adjust y position for image placement
        width: qrSize,
        height: qrSize
      })

      const firstSixDigits = `${chosenNetwork.currencyCode} ${address.slice(
        0,
        6
      )}`

      page.drawText(firstSixDigits, {
        size: 6,
        rotate: {
          type: RotationTypes.Degrees,
          angle: 90
        },
        x: x + leftPadding + qrSize + dpi(0.5) + qrSize,
        y: y - qrSize + 8 // Adjust y position for image placement
      })
    }
  }

  if (!existsSync(outPath)) {
    mkdirSync(outPath, { recursive: true })
  }

  const pdfBytes = await pdfDoc.save()
  writeFileSync(`${fullFilePath}.pdf`, pdfBytes)

  // Save keys JSON
  const fileJson = { network: networkName, keysJson }
  writeFileSync(`${fullFilePath}.json`, JSON.stringify(fileJson, null, 2))
}

main().catch(console.error)

import { Network, payments } from 'altcoin-js'
import ECPairFactory, { ECPairInterface } from 'ecpair'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { PDFDocument, PDFImage, RotationTypes } from 'pdf-lib'
import * as QRCode from 'qrcode'
import * as ecc from 'tiny-secp256k1'

import { config } from './config'

const debugFilename = false

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

// For HP LaserJet Pro 400 M401dn, each side is slightly offset
const backPagePrinterOffsetY = -dpi(1 / 16)
const frontPagePrinterOffsetX = -dpi(1 / 16)

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

const generateKeys = async (
  pdfDoc: PDFDocument,
  networkName: string
): Promise<{
  address: string
  privKey: string
  privateKeyImage: PDFImage
  publicKeyImage: PDFImage
}> => {
  const chosenNetwork = networks[networkName]
  const keyPair = generateKeyPair(networkName)
  const privKey: string = keyPair.toWIF()
  if (privKey == null) throw new Error('Private key is null')
  const uri = `https://deep.edge.app/pay/${networkName}/${privKey}`
  const privateKeyQR = await createQRCode(uri)

  const { address } = payments.p2pkh({
    network: chosenNetwork,
    pubkey: keyPair.publicKey
  })
  if (address == null) throw new Error('Address is null')
  const publicKeyQR = await createQRCode(address)
  const privateKeyImage = await pdfDoc.embedPng(privateKeyQR)
  const publicKeyImage = await pdfDoc.embedPng(publicKeyQR)

  return { address, privateKeyImage, privKey, publicKeyImage }
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
  const frontPage = pdfDoc.addPage([dpi(8.5), dpi(11)])
  const backPage = pdfDoc.addPage([dpi(8.5), dpi(11)])

  let fileName: string
  let fullFilePath: string
  while (true) {
    const timeIndex = new Date()
      .toISOString()
      .slice(2, 19)
      .replace(/T/g, '_')
      .replace(/-/g, '')
      .replace(/:/g, '')

    fileName = `keys-${networkName}-` + timeIndex
    fullFilePath = `${outPath}/${fileName}`
    if (!existsSync(`${fullFilePath}.pdf`)) {
      break
    }
  }
  if (debugFilename) {
    fileName = `keys-${networkName}-` + '999999_999999'
    fullFilePath = `${outPath}/${fileName}`
  }

  const keysJson: Array<{ pub: string; priv: string }> = []

  if (config.printToCard) {
    const frontCardBytes = readFileSync('./pdf/2024-03-EdgeGiftCard-front.pdf')
    const backCardBytes = readFileSync('./pdf/2024-03-EdgeGiftCard-back.pdf')
    const frontCardPdf = await PDFDocument.load(frontCardBytes)
    const backCardPdf = await PDFDocument.load(backCardBytes)

    // Import the business card PDF page
    const [frontCardPage] = await pdfDoc.embedPdf(frontCardPdf, [0])
    const [backCardPage] = await pdfDoc.embedPdf(backCardPdf, [0])

    const qrSize = dpi(1) // Example to fit both QR codes on one label
    const cardBleed = dpi(0.125)
    const width = dpi(3.5) + cardBleed * 2
    const height = dpi(2) + cardBleed * 2

    for (let row = 0; row < 4; row++) {
      // Printing on HP LaserJet Pro 400 M401dn causes a slight vertical shift
      // Compensate for this by adjusting the y position of the cards
      const yFudge = row * dpi(0.03125)
      const y = dpi(0.25 + (row + 1) * 0.5 + row * 2) - cardBleed + yFudge
      const imageY = y + 0.36 * height

      for (let column = 0; column < 2; column++) {
        const { address, privateKeyImage, privKey, publicKeyImage } =
          await generateKeys(pdfDoc, networkName)

        keysJson.push({ pub: address, priv: privKey })

        const x = dpi(0.5 + column * 4) - cardBleed

        // Draw the front of the card
        frontPage.drawPage(frontCardPage, {
          x: x + frontPagePrinterOffsetX,
          y,
          width,
          height
        })

        frontPage.drawImage(privateKeyImage, {
          x: x + frontPagePrinterOffsetX + 0.61 * width,
          y: imageY,
          width: qrSize,
          height: qrSize
        })

        const backColumn = column === 0 ? 1 : 0
        const backX = dpi(0.5 + backColumn * 4) - cardBleed

        // Draw the back of the card
        backPage.drawPage(backCardPage, {
          x: backX,
          y: backPagePrinterOffsetY + y,
          width,
          height
        })

        backPage.drawImage(publicKeyImage, {
          x: backX + dpi(0.25),
          y: imageY + backPagePrinterOffsetY,
          width: qrSize,
          height: qrSize
        })

        const firstDigits = `${chosenNetwork.currencyCode} ${address.slice(
          0,
          8
        )}`

        backPage.drawText(firstDigits, {
          size: 6,
          rotate: {
            type: RotationTypes.Degrees,
            angle: 90
          },
          x: backX + dpi(0.25) + qrSize,
          y: imageY + dpi(0.125) + backPagePrinterOffsetY // Adjust y position for image placement
        })
      }
    }
  } else {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const { address, privateKeyImage, privKey, publicKeyImage } =
          await generateKeys(pdfDoc, networkName)

        keysJson.push({ pub: address, priv: privKey })

        const x = leftRightMargin + column * (labelWidth + columnGap)
        const y =
          frontPage.getHeight() +
          labelHeight -
          (topBottomMargin + topPadding + (row + 1) * labelHeight)

        // Adjust QR code size if necessary to fit within the label dimensions
        const qrSize = labelHeight * 0.9 // Example to fit both QR codes on one label
        frontPage.drawImage(privateKeyImage, {
          x: x + leftPadding,
          y: y - qrSize, // Adjust y position for image placement
          width: qrSize,
          height: qrSize
        })

        frontPage.drawImage(publicKeyImage, {
          x: x + leftPadding + qrSize + dpi(0.5),
          y: y - qrSize, // Adjust y position for image placement
          width: qrSize,
          height: qrSize
        })

        const firstSixDigits = `${chosenNetwork.currencyCode} ${address.slice(
          0,
          6
        )}`

        frontPage.drawText(firstSixDigits, {
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

main().catch(e => console.error(String(e)))

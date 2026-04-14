# Edge Gift card printer

### Prints public/private keys onto an Avery 18660 sheet of labels

#### Installation

Install Bun

    https://bun.sh/docs/installation

Install dependencies

    bun install

Create PDF sheet of labels

    bun [coin] [device (optional)] [number of sheets (optional)]

ie

    bun doge

    bun ltc

Create several PDF sheets

    bun ltc -- default 8

    bun doge -- default 10


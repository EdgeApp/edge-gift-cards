# Edge Gift card printer

### Prints public/private keys onto an Avery 18660 sheet of labels

#### Installation

Install Bun

    https://bun.sh/docs/installation

Install dependencies

    bun install

#### Generate PDF sheets

Use the `gen` script with a **network** name (see below). Optional arguments: **device** (printer offset preset) and **sheets** (how many PDFs to generate).

    bun gen <network> [device] [sheets]

Show usage and the list of supported network names:

    bun gen

Examples:

    bun gen bitcoin

    bun gen dogecoin

    bun gen litecoin default 8

Network names are the keygen ids (for example `bitcoin`, `litecoin`, `dogecoin`, `zano`). Run `bun gen` with no arguments to print the full list for this project.

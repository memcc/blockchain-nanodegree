/**
 *                          Blockchain Class
 *  The Blockchain class contains the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because an array
 *  isn't a persistent storage method.
 *
 */

const hex2ascii = require('hex2ascii')
const SHA256 = require('crypto-js/sha256')
const BlockClass = require('./block.js')
const bitcoinMessage = require('bitcoinjs-message')
const find = require('lodash/find')

const createBlockTimestamp = () => new Date().getTime().toString().slice(0, -3)

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = []
    this.height = -1
    this.initializeChain()
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height < 0) {
      const block = new BlockClass.Block({ data: 'Block: Genesis' })
      await this._addBlock(block)
    }
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't forget
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  async _addBlock(block) {
    const chainErrors = await this.validateChain()

    if (chainErrors.length > 0) {
      throw new Error('Chain invalid, cannot add new block')
    }

    const hash = await SHA256(JSON.stringify(block)).toString()
    const height = this.chain.length
    const previousBlock = this.chain[height - 1]
    const time = createBlockTimestamp()

    block.hash = hash
    block.height = height
    block.previousBlockHash = previousBlock?.hash || null
    block.time = time

    const blockValid =
      block?.hash?.length === 64 &&
      block?.height === this.chain?.length &&
      block?.time

    if (!blockValid) {
      throw new Error('Block invalid')
    }

    this.chain.push(block)
    this.height = this.chain.length - 1

    return block
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  async requestMessageOwnershipVerification(address) {
    return `${address}:${createBlockTimestamp()}:starRegistry`
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Verify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  async submitStar(address, message, signature, star) {
    const requestTime = message.split(':')[1]
    const currentTime = createBlockTimestamp()

    const spendTime = parseInt(currentTime) - parseInt(requestTime)

    if (spendTime >= 5 * 60) {
      throw new Error('Request timeout')
    }

    if (!bitcoinMessage.verify(message, address, signature))
      throw new Error('Message cannot be verified')

    let block = new BlockClass.Block({ star })

    block.owner = address
    block = await this._addBlock(block)

    return block
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  async getBlockByHash(hash) {
    return find(this.chain, ['hash', hash])
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  async getBlockByHeight(height) {
    return find(this.chain, ['height', height])
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  async getStarsByWalletAddress(address) {
    const stars = this.chain.reduce((ownedBlocks = [], block) => {
      if (block.owner !== address) return ownedBlocks

      return [
        ...ownedBlocks,
        {
          ...block,
          body: JSON.parse(hex2ascii(block.body)),
        },
      ]
    })

    return stars
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validate`
   * 2. Each Block should check with the previousBlockHash
   */
  async validateChain() {
    const errors = []

    for (const currentBlock of this.chain) {
      if (currentBlock.height === 0) {
        // Skip validation as is genesis block
        break
      }

      const blockValid = await currentBlock.validate()

      if (!blockValid) {
        errors.push(
          new Error(
            `Invalid block at ${currentBlock.height}: ${currentBlock.hash}`
          )
        )
      }

      const previousBlock = await this.getBlockByHeight(currentBlock.height - 1)

      if (currentBlock.previousBlockHash !== previousBlock.hash) {
        errors.push(
          new Error(
            `Invalid block detected between Block ${currentBlock.height} / Block ${previousBlock.height}`
          )
        )
      }
    }

    return errors
  }
}

module.exports = { Blockchain }

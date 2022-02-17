/**
 *                          Block class
 *  The Block class is a main component into any Blockchain platform,
 *  it will store the data and act as a dataset for your application.
 *  The class will expose a method to validate the data. The body of
 *  the block will contain an Object that contain the data to be stored,
 *  the data should be stored encoded.
 *  All the exposed methods should return a Promise to allow all the methods
 *  run asynchronous.
 */
const SHA256 = require('crypto-js/sha256')
const hex2ascii = require('hex2ascii')

class Block {
  constructor(data) {
    this.body = Buffer.from(JSON.stringify(data), 'ascii').toString('hex')
    this.hash = null
    this.height = 0
    this.previousBlockHash = null
    this.time = 0
  }

  /**
   *  validate() method will validate if the block has been tampered or not.
   *  Been tampered means that someone from outside the application tried to change
   *  values in the block data as a consecuence the hash of the block should be different.
   *  Steps:
   *  1. Return a new promise to allow the method be called asynchronous.
   *  2. Save in the auxiliary variable the current hash of the block (`this` represents the block object)
   *  3. Recalculate the hash of the entire block (Use SHA256 from crypto-js library)
   *  4. Compare if the auxiliary hash value is different from the calculated one.
   *  5. Resolve true or false depending if it is valid or not.
   *  Note: to access the class values inside a Promise code you need to create an auxiliary value `let self = this;`
   */
  async validate() {
    const currentHash = this.hash;
    const calculatedHash = await SHA256(JSON.stringify({ ...self, hash: null })).toString()

    return currentHash === calculatedHash;
  }

  /**
   *  Auxiliary Method to return the block body (decoding the data)
   *  Steps:
   *
   *  1. Use hex2ascii module to decode the data
   *  2. Because data is a javascript object use JSON.parse(string) to get the Javascript Object
   *  3. Resolve with the data and make sure that you don't need to return the data for the `genesis block`
   *     or Reject with an error.
   */
  async getBData() {
    let self = this

    if (self.height === 0) {
        throw new Error('Genesis block detected');
    }
  
    const blockData = JSON.parse(hex2ascii(self.body))

    return blockData
  }
}

module.exports = { Block }

const inherits = require('util').inherits
const Component = require('react').Component
const h = require('react-hyperscript')
const { withRouter } = require('react-router-dom')
const { compose } = require('recompose')
const PropTypes = require('prop-types')
const connect = require('react-redux').connect
const actions = require('../../../store/actions')
const { DEFAULT_ROUTE } = require('../../../helpers/constants/routes')
const { getMetaMaskAccounts } = require('../../../selectors/selectors')
const ethUtil = require('ethereumjs-util')
import Button from '../../../components/ui/button'
import scrypt from 'scrypt-async'
const cryptojs = require('crypto-js')

import BN from 'bn.js'

const bitcoinB58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
var bitcoinB58charsValues = {}
for (var i in bitcoinB58chars) {
  bitcoinB58charsValues[bitcoinB58chars[i]] = parseInt(i)
}



const N = new BN('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141', 16, "be")

async function scryptProm (secrect) {
    const promise = new Promise((resolve, reject) => {
        scrypt(secrect, [], {N: 16384, r: 8, p: 8, dkLen: 32}, (res) => {
            resolve(res)
        })
    })
    return promise
}
function base58encode (value, length) {
  const b58chars = bitcoinB58chars
  var result = ''
  
  while (!value.isZero()) {
    var r = value.divmod(new BN(58))
    result = b58chars[r.mod] + result
    value = r.div
  }
  var inilen = result.length;
  for (var i = 0; i < length - inilen ; i++) {
    result = b58chars[0] + result
  }
  return result
}


async function verify_solo_check(string, size)
{
    var raw = string.slice(0, -size);
    var h = await cryptojs.SHA256(await cryptojs.SHA256(raw)).toString();
    var b = new BN(h, 16, "le");
    var b58 = new BN(58);
    var check = b.mod(b58.pow(new BN(size)));
    return base58encode(check, length=size) == string.slice(-size);
}
async function computePrivateKeySec256k1 (args) {
   var secret1B58 ="";
   var secret2B58 ="";


  const hashedSecret1 = await scryptProm(args.secret1)
  const hashedSecret2 = await scryptProm(args.secret2)
  const n1 = new BN(hashedSecret1, 16, "be")
  const n2 = new BN(hashedSecret2, 16, "be")
  const n0 = n1.add(n2).mod(N)
  return n0
}

SoloImportView.contextTypes = {
  t: PropTypes.func,
}

module.exports = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(SoloImportView)

function mapStateToProps (state) {
  return {
    error: state.appState.warning,
    firstAddress: Object.keys(getMetaMaskAccounts(state))[0],
  }
}

function mapDispatchToProps (dispatch) {
  return {
    importNewAccount: (strategy, [ privateKey ]) => {
      return dispatch(actions.importNewAccount(strategy, [ privateKey ]))
    },
    computeSolo: (func, args) => {
      return dispatch(actions.computeSolo(func, args))
    },
    displayWarning: (message) => dispatch(actions.displayWarning(message || null)),
    setSelectedAddress: (address) => dispatch(actions.setSelectedAddress(address)),
  }
}

inherits(SoloImportView, Component)
function SoloImportView () {
  this.createSoloOnEnter = this.createSoloOnEnter.bind(this)
  Component.call(this)
}

SoloImportView.prototype.render = function () {
  const { error, displayWarning } = this.props

  return (
    h('div.new-account-import-form__private-key', [

      h('span.new-account-create-form__instruction', this.context.t('address')),
      h('div.new-account-import-form__solo-input-container', [
        h('input.new-account-import-form__solo-input', {
          type: 'text',
          autoComplete: 'off',
          id: 'address-box',
        }),
      ]),

      h('span.new-account-create-form__instruction', this.context.t('soloSecret1')),

      h('div.new-account-import-form__solo-input-container', [
        h('input.new-account-import-form__solo-input', {
          type: 'text',
          autoComplete: 'off',
          id: 'secret1-box',
        }),
      ]),

      h('span.new-account-create-form__instruction', this.context.t('soloSecret2')),

      h('div.new-account-import-form__solo-input-container', [
        h('input.new-account-import-form__solo-input', {
          type: 'text',
          autoComplete: 'off',
          id: 'secret2-box',
          onKeyPress: e => this.createSoloOnEnter(e),
        }),
      ]),

      h('div.new-account-import-form__buttons', {}, [
        h(Button, {
          type: 'default',
          large: true,
          className: 'new-account-create-form__button',
          onClick: () => {
            displayWarning(null)
            this.props.history.push(DEFAULT_ROUTE)
          },
        }, [this.context.t('cancel')]),

        h(Button, {
          type: 'primary',
          large: true,
          className: 'new-account-create-form__button',
          onClick: () => this.createNewSoloKeychain(),
        }, [this.context.t('import')]),

      ]),

      error ? h('span.error', error) : null,
    ])
  )
}

SoloImportView.prototype.createSoloOnEnter = function (event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    this.createNewSoloKeychain()
  }
}

const getAddressKey = function (privateKey) {
  const privateKeyBuffer = Buffer.from(privateKey, 'hex')
  const addressKey = ethUtil.bufferToHex(ethUtil.privateToAddress(privateKeyBuffer))
  return ethUtil.toChecksumAddress(addressKey)
}

async function verif_args(args){
  var secret1 = args.secret1;
  var secret2 = args.secret2;
  var secret1B58;
  var secret2B58;
  if (secret1.length == 28 ){
    secret1B58 = secret1;
  }
  else if( secret1.length == 30)
  { 
    if (await verify_solo_check(secret1, 1) ){
        secret1B58 = secret1.slice(0,-1);
    }
    else{
        throw new Error("error secret 1: verify that you entered the secret correctly");
    }
  }
  else {
        throw new Error("error secret 1 size should be 28 or 30 characters instead of "+secret1.length);
  }

  if (secret2.length == 14 ){
    secret2B58 = secret2;
  }
  else if( secret2.length == 30)
  { 
    if (await verify_solo_check(secret2, 1) ){
        secret2B58 = secret2.slice(0,-1);
    }
    else{
        throw new Error("error secret 2: verify that you entered the secret correctly");
    }
  }
  else {
        throw new Error("error secret 2 size should be 14 or 30 characters instead of "+secret2.length);
  }
  return {secret1: secret1B58,secret2: secret2B58}
}

SoloImportView.prototype.createNewSoloKeychain = function () {
  const address = document.getElementById('address-box').value
  const secret1 = document.getElementById('secret1-box').value
  const secret2 = document.getElementById('secret2-box').value
  const {importNewAccount, computeSolo, history, displayWarning, setSelectedAddress, firstAddress} = this.props
  var secret1B58 = "";
  var secret2B58 = "";
  
  computeSolo(verif_args, {secret1: secret1, secret2: secret2}).then((args) => {
    secret1B58 = args.secret1;
    secret2B58 = args.secret2;
    computeSolo(computePrivateKeySec256k1, {secret1: secret1B58, secret2: secret2B58}).then((privkeyB256) => {
      const privateKey = privkeyB256.toArray(256)
      var add = getAddressKey(privateKey)
      if (add !== address) {
        displayWarning(this.context.t('soloError'))
      } else {
        importNewAccount('Private Key', [ privateKey ])
          .then(({ selectedAddress }) => {
            if (selectedAddress) {
              history.push(DEFAULT_ROUTE)
              displayWarning(null)
            } else {
              displayWarning('Error importing account.')
              setSelectedAddress(firstAddress)
            }
          })
          .catch(err => err && displayWarning(err.message || err))
      }
    })
  }).catch(err => err && displayWarning(err.message || err))


}


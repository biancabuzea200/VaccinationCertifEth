import Web3 from "web3";
import certificateArtifact from "./Certificate.json";

const HDWalletProvider = require("@truffle/hdwallet-provider");

const App = {
  web3: null,
  account: null,
  contract: null,

  start: async function() {
    $('#spinner').hide();

    const { web3 } = this;

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = certificateArtifact.networks[networkId];
      this.contract = new web3.eth.Contract(
        certificateArtifact.abi,
        deployedNetwork.address,
      );

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];
      console.log(this.account);

      this.bindEvents();
    } catch (error) {
      console.error("Could not connect to contract or chain.");
    }
  },

  registerCertificate: async function(e) {
    e.preventDefault();

    $('#spinner').show();

    const { registerCertificate } = this.contract.methods;
    const identityIdHash = await this.hashIdentity($('#identity_type').val(), $('#identity_id').val());
    console.log("identityIdHash:", identityIdHash)
    const doseDateArray = $('#dose_date').val().split('/');

    try {
      let resp = await registerCertificate(
        $('#identity_type').val(),
        identityIdHash,
        $('#vaccine_manufacturer').val(),
        Date.UTC(doseDateArray[0], doseDateArray[1] - 1, doseDateArray[2]) / 1000,
        $('#dose_received').val(),
        $('#country_issued').val(),
        $('#location_issued').val()
      ).send({ from: App.account });
      console.log("transaction:", resp);

      $('#qrCodeDiv').qrcode( {text: identityIdHash} );
      $('#qrlink').attr("href", identityIdHash);
      $("#transactionHash").attr("href", `https://ropsten.etherscan.io/tx/${resp.transactionHash}`);
      $('#mainForm').hide();
      $('#qrResults').show();
    } catch(e) {
      console.log("registerCertificate error:", e);
      $('#certError').show();
    }

    $('#spinner').hide();
  },

  bindEvents: function () {
    let blockchainIdentityId;

    $(document).on('click', '#qrlink', async function (e) {
      e.preventDefault();
      $('#identity_id_check').val("");

      const identifyHash = $('#qrlink').attr("href");
      $('#validCert').hide();
      $('#invalidCert').hide();
      $('#certificateContainer').show();
      $('#qrResults').hide();
      
      const { verifyCertificate } = App.contract.methods;
      const data = await verifyCertificate(identifyHash).call()
      console.log("data:", data);

      blockchainIdentityId = data[1];
      $('#viewCertDocType').text(data[0]);
      $('#viewCertManuf').text(data[2]);
      $('#viewCertDoseDate').text(new Date(data[3] * 1000).toISOString().split('T')[0]);
      $('#viewCertNoDoses').text(data[4]);
      $('#viewCertIssuer').text(data[5] + ", " + data[6]);
    });

    $(document).on('click', '#submitCheckCertificate', async function (e) {
      e.preventDefault();

      const identityIdHash = await App.hashIdentity($('#viewCertDocType').text(), $('#identity_id_check').val());
      console.log("identityIdHash:", identityIdHash);

      if (blockchainIdentityId == identityIdHash) {
        console.log("Valid Certificate");
        $('#validCert').show();
        $('#invalidCert').hide();
      } else {
        console.log("Invalid Certificate");
        $('#validCert').hide();
        $('#invalidCert').show();
      }
    });
  },

  hashIdentity: async function (identityType, identityId) {
    const msgBuffer = new TextEncoder('utf-8').encode(identityType + identityId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(hashArray)));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return "0x" + hashHex;
  }
};

window.App = App;

window.addEventListener("load", function() {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn(
      "No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live",
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    // App.web3 = new Web3(
    //   new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    // );
    App.web3 = new Web3(
      new HDWalletProvider({
        mnemonic: {
          phrase: "dove click mule close debris elegant rack slice coil divorce illness elbow"
        },
        providerOrUrl: "https://l2m8y3b9za.execute-api.eu-west-1.amazonaws.com/ropsten"
      })
    );
  }

  App.start();
});

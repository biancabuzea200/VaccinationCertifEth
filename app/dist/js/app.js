App = {
  web3Provider: null,
  account: null,
  contracts: {},

  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
  //   const biancaEthereumProvider ="https://l2m8y3b9za.execute-api.eu-west-1.amazonaws.com";
  //   //Bianca 22
  //   const bianca2 = "https://3fou0vdmq8.execute-api.eu-west-1.amazonaws.com";
   
  //  // ​
  //  // Everton
  //  const evertonEthereumProvider = "https://irnm86veza.execute-api.us-east-1.amazonaws.com";
  //  // ​
  //  const myProviderUrl = `${biancaEthereumProvider}/ropsten`;
  //  const provider = new ethers.providers.JsonRpcProvider(myProviderUrl);
  //  provider.getBlock().then(console.log);

    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('https://l2m8y3b9za.execute-api.eu-west-1.amazonaws.com/ropsten');
    }
    web3 = new Web3(App.web3Provider);

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      console.log("accounts:", accounts)
      App.account = accounts[0];
    });

    return await App.initContract();
  },

  initContract: async function () {
    $.getJSON('Certificate.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      let CertificateArtifact = data;
      App.contracts.Certificate = TruffleContract(CertificateArtifact);

      // Set the provider for our contract
      App.contracts.Certificate.setProvider(App.web3Provider);

      App.contracts.Certificate.deployed().then(async function (instance) {
        return instance.verifyCertificate("0x123c28b1f767eafd6653b50f7d2f110bb6a5e3181a29b9c7787d39bb7a3db139");
      }).then(function (data) {
        console.log("data:", data);
      }).catch(function (err) {
        console.log(err.message);
      });
    });

    return App.bindEvents();
  },

  hashIdentity: async function (identityType, identityId) {
    const msgBuffer = new TextEncoder('utf-8').encode(identityType + identityId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(hashArray)));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return "0x" + hashHex;
  },

  bindEvents: function () {
    let blockchainIdentityId;

    $(document).on('click', '#submitNewCertificate', async function (e) {
      e.preventDefault();
      
      App.contracts.Certificate.deployed().then(async function (instance) {
        let identityIdHash = await App.hashIdentity($('#identity_type').val(), $('#identity_id').val());
        console.log("identityIdHash:", identityIdHash)
        const doseDateArray = $('#dose_date').val().split('/');

        let resp = await instance.registerCertificate(
          $('#identity_type').val(),
          identityIdHash,
          $('#vaccine_manufacturer').val(),
          new Date(doseDateArray[0], doseDateArray[1], doseDateArray[2]).getTime() / 1000,
          $('#dose_received').val(),
          $('#country_issued').val(),
          $('#location_issued').val(),
          { from: App.account }
        );
        console.log("transaction:", resp);

        $('#name').qrcode( {text: identityIdHash} );
        $('#qrlink').attr("href", identityIdHash);
        $('#mainForm').hide();
        $('#qrResults').show();
      }).catch(function (err) {
        console.log(err.message);
        $('#certError').removeClass("d-none");
      });
    });

    $(document).on('click', '#qrlink', async function (e) {
      e.preventDefault();
      // it should ask the blockchain about the existance of the certificate
      const identifyHash = $('#qrlink').attr("href");
      $('#validCert').hide();
      $('#invalidCert').hide();
      $('#certificateContainer').show();
      
      App.contracts.Certificate.deployed().then(async function (instance) {
        return instance.verifyCertificate(identifyHash);
      }).then(function (data) {
        console.log("data:", data);

        blockchainIdentityId = data[1];
        $('#qrResults').hide();
        $('#viewCertDocType').text(data[0]);
        $('#viewCertManuf').text(data[2]);
        $('#viewCertDoseDate').text(new Date(data[3].toNumber() * 1000).toISOString().split('T')[0]);
        $('#viewCertNoDoses').text(data[4].toNumber());
        $('#viewCertIssuer').text(data[5] + ", " + data[6]);
      }).catch(function (err) {
        console.log(err.message);
      });
    });

    $(document).on('click', '#submitCheckCertificate', async function (e) {
      e.preventDefault();

      let identityIdHash = await App.hashIdentity($('#viewCertDocType').text(), $('#identity_id_check').val());
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

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});

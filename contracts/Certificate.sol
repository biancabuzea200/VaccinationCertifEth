pragma solidity ^0.8.0;

contract Certificate {

    // 0x497a894cdaf0a1822de78c938488592f83b80c6e6f041c4768f8dd3a3d3f8edf - tx
    // 0x68b6027e3c124421828df868c0e3c12eef6ae48a - contract

    struct VaccinCert {
        string identityType;    // It can be "passport" or "national id"
        bytes32 identityIdHash; // The hash of the passport or national id no
        string vaccineManufacturer; // Can be Pgizer, AstraVeneca, Moderna
        uint32 doseDate;       // The date of the second dose as UNIX UTC
        uint32 doseReceived;   // The number of doses that were received
        string countryIssued;   // country
        string locationIssued;  // city
    }

    mapping (bytes32 => VaccinCert) certificatesMapping;
    
    // Requires the identityIdHash not to be registered in the system
    modifier identityIdHashDoesNotExist (bytes32 _identityIdHash) {
        require(_identityIdHash != bytes32(0x0), "Cannot add an identityIdHash with hash 0x0");
        require (certificatesMapping[_identityIdHash].identityIdHash == bytes32(0x0), "identityIdHash already exists");
        _;
    }

    function registerCertificate(
            string memory _identityType,
            bytes32 _identityIdHash,
            string memory _vaccineManufacturer,
            uint32 _doseDate,
            uint32 _doseReceived,
            string memory _countryIssued,
            string memory _locationIssued
            ) public identityIdHashDoesNotExist(_identityIdHash) {

        VaccinCert memory cert = VaccinCert({
            identityType: _identityType,
            identityIdHash: _identityIdHash,
            vaccineManufacturer: _vaccineManufacturer,
            doseDate: _doseDate,
            doseReceived: _doseReceived,
            countryIssued: _countryIssued,
            locationIssued: _locationIssued
        });

        certificatesMapping[_identityIdHash] = cert;
    }

    function verifyCertificate(bytes32 _identityIdHash) public view 
        returns (string memory, bytes32, string memory, uint32, uint32, string memory, string memory) {
        VaccinCert memory cert = certificatesMapping[_identityIdHash];

        return (
            cert.identityType,
            cert.identityIdHash,
            cert.vaccineManufacturer,
            cert.doseDate,
            cert.doseReceived,
            cert.countryIssued,
            cert.locationIssued
        );
    }
}
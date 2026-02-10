// Dummy SMS service (Twilio removed)

const sendSMS = async (to, message) => {
    console.log(`[SMS MOCK] To: ${to} | Message: ${message}`);
    return;
};

module.exports = { sendSMS };

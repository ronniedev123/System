const fs = require('fs');
const { Parser } = require('json2csv');

function exportToCSV(data, fileName) {
    try {
        const parser = new Parser();
        const csv = parser.parse(data);
        fs.writeFileSync(fileName, csv);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

module.exports = { exportToCSV };

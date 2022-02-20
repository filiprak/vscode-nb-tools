const request = require('request');
const fs = require('fs');

const dest = "bin/nb-fmt.jar";

request
    .get({
        url: "https://github.com/filiprak/netbeans/releases/download/12.6-nb-fmt-1.0.0/nb-fmt.jar",
        followAllRedirects: true,
    })
    .on('error', function (err) {
        fs.unlink(dest);
    })
    .pipe(fs.createWriteStream(dest));

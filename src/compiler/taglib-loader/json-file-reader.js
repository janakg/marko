var fs = require("fs");
var virtualFS = require("../../vfs");
var stripJsonComments = require("strip-json-comments");
var fsReadOptions = { encoding: "utf8" };

exports.readFileSync = function(path) {
    var vfs = virtualFS.getVirtualFileSystem();
    if (vfs) {
        fs = vfs;
    }

    var json = fs.readFileSync(path, fsReadOptions);

    try {
        var taglibProps = JSON.parse(stripJsonComments(json));
        return taglibProps;
    } catch (e) {
        throw new Error(
            'Unable to parse JSON file at path "' + path + '". Error: ' + e
        );
    }
};

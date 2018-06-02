var nativeFS = require("fs");
var virtualFS = require("../../vfs");
var stripJsonComments = require("strip-json-comments");
var fsReadOptions = { encoding: "utf8" };
var fs = nativeFS;

exports.readFileSync = function(path) {
    //Checking "generated" keyword to allow other lookups. Must be a better way to do this.
    var vfs = virtualFS.getVirtualFileSystem();
    if (vfs && path.indexOf("generated/") > -1) {
        fs = vfs;
    } else {
        fs = nativeFS;
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

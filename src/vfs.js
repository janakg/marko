/**
 *  This would behave as a store for VFS. This is useful for compiling parallel
 *  Marko templates without writing into FS.
 */

var virtualFS = null;
function setVirtualFileSystem(fs) {
    if (fs) virtualFS = fs;
}

function getVirtualFileSystem() {
    return virtualFS;
}

var vfs = {
    setVirtualFileSystem: setVirtualFileSystem,
    getVirtualFileSystem: getVirtualFileSystem
};

module.exports = vfs;

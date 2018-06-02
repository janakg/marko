var compiler = require("./compiler");
var { fs, vol } = require("memfs");

var componentCode =
    "<div> \
  <p>Hello ${input.name}!</p> \
  <button if(input.renderBody)> \
     <include(input.renderBody)/> \
  </button> \
</div>";

var sourceCode = `class {
    onCreate() {
        this.state = {
            mounted: false
        };
    }
    onMount() {
        this.state.mounted = true;
    }
}

<div>
    <p if(state.mounted)>
        UI component successfully mounted!
        <ContentBox name='Frank'> Shop Now </ContentBox>
    </p>
</div>`;

/* Configure the VFS */
compiler.configureVFS(fs);

var cwd = process.cwd();
vol.mkdirpSync(cwd + "/src/generated/components/ContentBox/");
fs.writeFileSync(
    cwd + "/src/generated/components/ContentBox/index.marko",
    componentCode,
    "utf8"
);

var tab_json = {
    "tags-dir": [cwd + "/src/generated/components"]
};

// var tab_json = {
//   "<ContentBox>": { "template": cwd + "/src/generated/components/ContentBox/index.marko"}
// }

fs.writeFileSync(cwd + "/src/generated/marko.json", JSON.stringify(tab_json));
compiler.registerTaglib(cwd + "/src/generated/marko.json");

vol.mkdirpSync(cwd + "/src/generated/templates/example01/");
var filePath = cwd + "/src/generated/templates/example01/index.marko";
fs.writeFileSync(filePath, sourceCode);

var compiled = compiler.compileFile(filePath, {
    output: "vdom",
    browser: true,
    writeVersionComment: false,
    sourceOnly: false,
    meta: false
});

var compiledSrc = compiled.code;
fs.writeFileSync(
    cwd + "/src/generated/templates/example01/index.marko.js",
    compiledSrc
);

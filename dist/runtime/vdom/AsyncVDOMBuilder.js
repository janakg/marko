var EventEmitter = require("events-light");
var vdom = require("./vdom");
var VElement = vdom.am_;
var VDocumentFragment = vdom.aH_;
var VComment = vdom.aI_;
var VText = vdom.aJ_;
var VComponent = vdom.aK_;
var virtualizeHTML = vdom.aL_;
var RenderResult = require("../RenderResult");
var defaultDocument = vdom.aM_;
var morphdom = require("../../morphdom");

var EVENT_UPDATE = "update";
var EVENT_FINISH = "finish";

function State(tree) {
    this.aN_ = new EventEmitter();
    this.aO_ = tree;
    this.aP_ = false;
}

function AsyncVDOMBuilder(globalData, parentNode, parentOut) {
    if (!parentNode) {
        parentNode = new VDocumentFragment();
    }

    var state;

    if (parentOut) {
        state = parentOut.g_;
    } else {
        state = new State(parentNode);
    }

    this.aQ_ = 1;
    this.aR_ = 0;
    this.aS_ = null;
    this.aT_ = parentOut;

    this.data = {};
    this.g_ = state;
    this.ac_ = parentNode;
    this.global = globalData || {};
    this.aU_ = [parentNode];
    this.aV_ = false;
    this.aW_ = undefined;
    this._r_ = null;

    this._Z_ = null;
    this.aa_ = null;
    this.a__ = null;
}

var proto = AsyncVDOMBuilder.prototype = {
    aD_: true,
    v_: defaultDocument,

    bc: function (component) {
        var vComponent = new VComponent(component);
        return this.aX_(vComponent, 0, true);
    },

    af_: function (component) {
        var vComponent = new VComponent(component, true);
        this.aX_(vComponent, 0);
    },

    aX_: function (child, childCount, pushToStack) {
        this.ac_.aY_(child);
        if (pushToStack === true) {
            this.aU_.push(child);
            this.ac_ = child;
        }
        return childCount === 0 ? this : child;
    },

    element: function (tagName, attrs, key, component, childCount, flags, props) {
        var element = new VElement(tagName, attrs, key, component, childCount, flags, props);
        return this.aX_(element, childCount);
    },

    aZ_: function (tagName, attrs, key, component, childCount, flags, props) {
        var element = VElement.b__(tagName, attrs, key, component, childCount, flags, props);
        return this.aX_(element, childCount);
    },

    n: function (node, component) {
        // NOTE: We do a shallow clone since we assume the node is being reused
        //       and a node can only have one parent node.
        var clone = node.ba_();
        this.node(clone);
        clone._a_ = component;

        return this;
    },

    node: function (node) {
        this.ac_.aY_(node);
        return this;
    },

    text: function (text) {
        var type = typeof text;

        if (type != "string") {
            if (text == null) {
                return;
            } else if (type === "object") {
                if (text.toHTML) {
                    return this.h(text.toHTML());
                }
            }

            text = text.toString();
        }

        this.ac_.aY_(new VText(text));
        return this;
    },

    comment: function (comment) {
        return this.node(new VComment(comment));
    },

    html: function (html) {
        if (html != null) {
            var vdomNode = virtualizeHTML(html, this.v_ || document);
            this.node(vdomNode);
        }

        return this;
    },

    beginElement: function (tagName, attrs, key, component, childCount, flags, props) {
        var element = new VElement(tagName, attrs, key, component, childCount, flags, props);
        this.aX_(element, childCount, true);
        return this;
    },

    bb_: function (tagName, attrs, key, component, childCount, flags, props) {
        var element = VElement.b__(tagName, attrs, key, component, childCount, flags, props);
        this.aX_(element, childCount, true);
        return this;
    },

    endElement: function () {
        var stack = this.aU_;
        stack.pop();
        this.ac_ = stack[stack.length - 1];
    },

    end: function () {
        this.ac_ = undefined;

        var remaining = --this.aQ_;
        var parentOut = this.aT_;

        if (remaining === 0) {
            if (parentOut) {
                parentOut.bc_();
            } else {
                this.bd_();
            }
        } else if (remaining - this.aR_ === 0) {
            this.be_();
        }

        return this;
    },

    bc_: function () {
        var remaining = --this.aQ_;

        if (remaining === 0) {
            var parentOut = this.aT_;
            if (parentOut) {
                parentOut.bc_();
            } else {
                this.bd_();
            }
        } else if (remaining - this.aR_ === 0) {
            this.be_();
        }
    },

    bd_: function () {
        var state = this.g_;
        state.aP_ = true;
        state.aN_.emit(EVENT_FINISH, this.aE_());
    },

    be_: function () {
        var lastArray = this._last;

        var i = 0;

        function next() {
            if (i === lastArray.length) {
                return;
            }
            var lastCallback = lastArray[i++];
            lastCallback(next);

            if (!lastCallback.length) {
                next();
            }
        }

        next();
    },

    error: function (e) {
        try {
            this.emit("error", e);
        } finally {
            // If there is no listener for the error event then it will
            // throw a new Error here. In order to ensure that the async fragment
            // is still properly ended we need to put the end() in a `finally`
            // block
            this.end();
        }

        return this;
    },

    beginAsync: function (options) {
        if (this.aV_) {
            throw Error("Tried to render async while in sync mode. Note: Client side await is not currently supported in re-renders (Issue: #942).");
        }

        var state = this.g_;

        if (options) {
            if (options.last) {
                this.aR_++;
            }
        }

        this.aQ_++;

        var documentFragment = this.ac_.bf_();
        var asyncOut = new AsyncVDOMBuilder(this.global, documentFragment, this);

        state.aN_.emit("beginAsync", {
            out: asyncOut,
            parentOut: this
        });

        return asyncOut;
    },

    createOut: function () {
        return new AsyncVDOMBuilder(this.global);
    },

    flush: function () {
        var events = this.g_.aN_;

        if (events.listenerCount(EVENT_UPDATE)) {
            events.emit(EVENT_UPDATE, new RenderResult(this));
        }
    },

    S_: function () {
        return this.g_.aO_;
    },

    aE_: function () {
        return this.bg_ || (this.bg_ = new RenderResult(this));
    },

    on: function (event, callback) {
        var state = this.g_;

        if (event === EVENT_FINISH && state.aP_) {
            callback(this.aE_());
        } else if (event === "last") {
            this.onLast(callback);
        } else {
            state.aN_.on(event, callback);
        }

        return this;
    },

    once: function (event, callback) {
        var state = this.g_;

        if (event === EVENT_FINISH && state.aP_) {
            callback(this.aE_());
        } else if (event === "last") {
            this.onLast(callback);
        } else {
            state.aN_.once(event, callback);
        }

        return this;
    },

    emit: function (type, arg) {
        var events = this.g_.aN_;
        switch (arguments.length) {
            case 1:
                events.emit(type);
                break;
            case 2:
                events.emit(type, arg);
                break;
            default:
                events.emit.apply(events, arguments);
                break;
        }
        return this;
    },

    removeListener: function () {
        var events = this.g_.aN_;
        events.removeListener.apply(events, arguments);
        return this;
    },

    sync: function () {
        this.aV_ = true;
    },

    isSync: function () {
        return this.aV_;
    },

    onLast: function (callback) {
        var lastArray = this._last;

        if (lastArray === undefined) {
            this._last = [callback];
        } else {
            lastArray.push(callback);
        }

        return this;
    },

    aB_: function (doc) {
        var node = this.aW_;
        if (!node) {
            var vdomTree = this.S_();
            // Create the root document fragment node
            doc = doc || this.v_ || document;
            this.aW_ = node = vdomTree.aq_(doc);
            morphdom(node, null, null, vdomTree, doc, this._r_);
        }
        return node;
    },

    toString: function (doc) {
        var docFragment = this.aB_(doc);
        var html = "";

        var child = docFragment.firstChild;
        while (child) {
            var nextSibling = child.nextSibling;
            if (child.nodeType != 1) {
                var container = docFragment.ownerDocument.createElement("div");
                container.appendChild(child.cloneNode());
                html += container.innerHTML;
            } else {
                html += child.outerHTML;
            }

            child = nextSibling;
        }

        return html;
    },

    then: function (fn, fnErr) {
        var out = this;
        var promise = new Promise(function (resolve, reject) {
            out.on("error", reject).on(EVENT_FINISH, function (result) {
                resolve(result);
            });
        });

        return Promise.resolve(promise).then(fn, fnErr);
    },

    catch: function (fnErr) {
        return this.then(undefined, fnErr);
    },

    isVDOM: true,

    c: function (componentDef, key, customEvents) {
        this._Z_ = componentDef;
        this.aa_ = key;
        this.a__ = customEvents;
    }
};

proto.e = proto.element;
proto.ed = proto.aZ_;
proto.be = proto.beginElement;
proto.bed = proto.bb_;
proto.ee = proto.endElement;
proto.t = proto.text;
proto.h = proto.w = proto.write = proto.html;

module.exports = AsyncVDOMBuilder;
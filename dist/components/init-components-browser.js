"use strict";

var warp10Finalize = require("warp10/finalize");
var eventDelegation = require("./event-delegation");
var win = window;
var defaultDocument = document;
var componentsUtil = require("./util");
var componentLookup = componentsUtil.a_;
var ComponentDef = require("./ComponentDef");
var registry = require("./registry");
var serverRenderedGlobals = {};
var serverComponentStartNodes = {};
var serverComponentEndNodes = {};
var keyedElementsByComponentId = {};

var FLAG_WILL_RERENDER_IN_BROWSER = 1;
var FLAG_HAS_BODY_EL = 2;
var FLAG_HAS_HEAD_EL = 4;

function indexServerComponentBoundaries(node) {
    var componentId;

    node = node.firstChild;
    while (node) {
        if (node.nodeType === 8) {
            // Comment node
            var commentValue = node.nodeValue;
            if (commentValue[0] === "M") {
                componentId = commentValue.substring(2);

                var firstChar = commentValue[1];

                if (firstChar === "/") {
                    serverComponentEndNodes[componentId] = node;
                } else if (firstChar === "^" || firstChar === "#") {
                    serverComponentStartNodes[componentId] = node;
                }
            }
        } else if (node.nodeType === 1) {
            // HTML element node
            var markoKey = node.getAttribute("data-marko-key");
            if (markoKey) {
                var separatorIndex = markoKey.indexOf(" ");
                componentId = markoKey.substring(separatorIndex + 1);
                markoKey = markoKey.substring(0, separatorIndex);
                var keyedElements = keyedElementsByComponentId[componentId] || (keyedElementsByComponentId[componentId] = {});
                keyedElements[markoKey] = node;
            }
            indexServerComponentBoundaries(node);
        }

        node = node.nextSibling;
    }
}

function invokeComponentEventHandler(component, targetMethodName, args) {
    var method = component[targetMethodName];
    if (!method) {
        throw Error("Method not found: " + targetMethodName);
    }

    method.apply(component, args);
}

function addEventListenerHelper(el, eventType, isOnce, listener) {
    var eventListener = listener;
    if (isOnce) {
        eventListener = function (event) {
            listener(event);
            el.removeEventListener(eventType, eventListener);
        };
    }

    el.addEventListener(eventType, eventListener, false);

    return function remove() {
        el.removeEventListener(eventType, eventListener);
    };
}

function addDOMEventListeners(component, el, eventType, targetMethodName, isOnce, extraArgs, handles) {
    var removeListener = addEventListenerHelper(el, eventType, isOnce, function (event) {
        var args = [event, el];
        if (extraArgs) {
            args = extraArgs.concat(args);
        }

        invokeComponentEventHandler(component, targetMethodName, args);
    });
    handles.push(removeListener);
}

function initComponent(componentDef, doc) {
    var component = componentDef._a_;

    if (!component || !component.y_) {
        return; // legacy
    }

    component.e_();
    component.v_ = doc;

    var isExisting = componentDef._c_;
    var id = component.id;

    componentLookup[id] = component;

    if (componentDef._e_ & FLAG_WILL_RERENDER_IN_BROWSER) {
        component.M_(true);
        return;
    }

    if (isExisting) {
        component.C_();
    }

    var domEvents = componentDef._b_;
    if (domEvents) {
        var eventListenerHandles = [];

        domEvents.forEach(function (domEventArgs) {
            // The event mapping is for a direct DOM event (not a custom event and not for bubblign dom events)

            var eventType = domEventArgs[0];
            var targetMethodName = domEventArgs[1];
            var eventEl = component.w_[domEventArgs[2]];
            var isOnce = domEventArgs[3];
            var extraArgs = domEventArgs[4];

            addDOMEventListeners(component, eventEl, eventType, targetMethodName, isOnce, extraArgs, eventListenerHandles);
        });

        if (eventListenerHandles.length) {
            component.k_ = eventListenerHandles;
        }
    }

    if (component.p_) {
        component.b_("update");
    } else {
        component.p_ = true;
        component.b_("mount");
    }
}

/**
 * This method is used to initialized components associated with UI components
 * rendered in the browser. While rendering UI components a "components context"
 * is added to the rendering context to keep up with which components are rendered.
 * When ready, the components can then be initialized by walking the component tree
 * in the components context (nested components are initialized before ancestor components).
 * @param  {Array<marko-components/lib/ComponentDef>} componentDefs An array of ComponentDef instances
 */
function initClientRendered(componentDefs, doc) {
    // Ensure that event handlers to handle delegating events are
    // always attached before initializing any components
    eventDelegation._L_(doc);

    doc = doc || defaultDocument;
    for (var i = componentDefs.length - 1; i >= 0; i--) {
        var componentDef = componentDefs[i];
        initComponent(componentDef, doc);
    }
}

/**
 * This method initializes all components that were rendered on the server by iterating over all
 * of the component IDs.
 */
function initServerRendered(renderedComponents, doc) {
    if (!renderedComponents) {
        renderedComponents = win.$components;

        if (renderedComponents && renderedComponents.forEach) {
            renderedComponents.forEach(function (renderedComponent) {
                initServerRendered(renderedComponent, doc);
            });
        }

        win.$components = {
            concat: initServerRendered
        };

        return;
    }

    doc = doc || defaultDocument;

    // Ensure that event handlers to handle delegating events are
    // always attached before initializing any components
    eventDelegation._L_(doc);

    renderedComponents = warp10Finalize(renderedComponents);

    var componentDefs = renderedComponents.w;
    var typesArray = renderedComponents.t;
    var globals = window.$MG;
    if (globals) {
        serverRenderedGlobals = warp10Finalize(globals);
        delete window.$MG;
    }

    componentDefs.forEach(function (componentDef) {
        componentDef = ComponentDef._m_(componentDef, typesArray, serverRenderedGlobals, registry);
        var componentId = componentDef.id;
        var component = componentDef._a_;

        var startNode;
        var endNode;
        var flags = componentDef._e_;
        if ((flags & 6) === 6) {
            startNode = document.head;
            endNode = document.body;
        } else if (flags & FLAG_HAS_BODY_EL) {
            startNode = endNode = document.body;
        } else if (flags & FLAG_HAS_HEAD_EL) {
            startNode = endNode = document.head;
        } else {
            var startNodeComment = serverComponentStartNodes[componentId];
            if (!startNodeComment) {
                indexServerComponentBoundaries(doc);
                startNodeComment = serverComponentStartNodes[componentId];
            }
            var endNodeComment = serverComponentEndNodes[componentId];

            startNode = startNodeComment.nextSibling;

            if (startNode === endNodeComment) {
                // Component has no output nodes so just mount to the start comment node
                // and we will remove the end comment node
                startNode = endNode = startNodeComment;
            } else {
                startNodeComment.parentNode.removeChild(startNodeComment);

                if (startNode.parentNode === document) {
                    endNode = startNode = document.documentElement;
                } else {
                    // Remove the start and end comment nodes and use the inner nodes
                    // as the boundary
                    endNode = endNodeComment.previousSibling;
                }
            }

            if (endNodeComment) {
                endNodeComment.parentNode.removeChild(endNodeComment);
            }
        }

        component.w_ = keyedElementsByComponentId[componentId] || {};
        component.h_ = startNode;
        component.i_ = endNode;

        startNode.B_ = component;

        delete keyedElementsByComponentId[componentId];

        // Mark the start node so that we know we need to skip past this
        // node when matching up children
        startNode.h_ = true;

        // Mark the end node so that when we attempt to find boundaries
        // for nested UI components we don't accidentally go outside the boundary
        // of the parent component
        endNode.i_ = true;

        initComponent(componentDef, doc || defaultDocument);
    });
}

exports._u_ = initClientRendered;
exports._O_ = initServerRendered;
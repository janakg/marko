var getComponentsContext = require("../ComponentsContext").__;
var componentsUtil = require("../util");
var componentLookup = componentsUtil.a_;
var registry = require("../registry");
var modernRenderer = require("../renderer");
var resolveComponentKey = modernRenderer._W_;
var handleBeginAsync = modernRenderer._X_;
var beginComponent = require("../beginComponent");
var endComponent = require("../endComponent");

var WIDGETS_BEGIN_ASYNC_ADDED_KEY = "$wa";

function createRendererFunc(templateRenderFunc, componentProps) {
    var typeName = componentProps._l_;
    var assignedId = componentProps.id;
    var isSplit = componentProps._Y_ === true;

    return function renderer(input, out, renderingLogic) {
        var outGlobal = out.global;

        if (!outGlobal[WIDGETS_BEGIN_ASYNC_ADDED_KEY]) {
            outGlobal[WIDGETS_BEGIN_ASYNC_ADDED_KEY] = true;
            out.on("beginAsync", handleBeginAsync);
        }

        var getInitialProps;
        var getTemplateData;
        var getInitialState;
        var getWidgetConfig;
        var getInitialBody;

        if (renderingLogic) {
            getInitialProps = renderingLogic.getInitialProps;
            getTemplateData = renderingLogic.getTemplateData;
            getInitialState = renderingLogic.getInitialState;
            getWidgetConfig = renderingLogic.getWidgetConfig;
            getInitialBody = renderingLogic.getInitialBody;
        }

        var widgetConfig;
        var componentBody;
        var componentState;

        var componentsContext = getComponentsContext(out);
        var globalComponentsContext = componentsContext.P_;

        var component = globalComponentsContext.Q_;

        var isRerender = component !== undefined;
        var id = assignedId;
        var isExisting;
        var customEvents;
        var scope;
        var parentComponentDef;

        if (component) {
            id = component.id;
            isExisting = true;
            globalComponentsContext.Q_ = null;
        } else {
            parentComponentDef = componentsContext._p_;
            var componentDefFromArgs;
            if (componentDefFromArgs = out._Z_) {
                scope = componentDefFromArgs.id;
                out._Z_ = null;

                customEvents = out.a__;
                var key = out.aa_;

                if (key != null) {
                    key = key.toString();
                }
                id = id || resolveComponentKey(globalComponentsContext, key, componentDefFromArgs);
            } else if (parentComponentDef) {
                id = parentComponentDef._k_();
            } else {
                id = globalComponentsContext._k_();
            }
        }

        if (registry.ab_ && typeName) {
            if (renderingLogic) delete renderingLogic.onRender;
            component = registry._n_(renderingLogic || {}, id, input, out, typeName, customEvents, scope);
        } else {
            if (!component) {
                if (isRerender) {
                    // Look in in the DOM to see if a component with the same ID and type already exists.
                    component = componentLookup[id];
                    if (component && component._l_ !== typeName) {
                        component = undefined;
                    }
                }

                if (component) {
                    isExisting = true;
                } else {
                    isExisting = false;
                    // We need to create a new instance of the component
                    if (typeName) {
                        component = registry._n_(typeName, id);
                    }
                }
            }
        }

        if (component) {
            component.s_ = true;
        }

        if (input) {
            if (getWidgetConfig) {
                // If getWidgetConfig() was implemented then use that to
                // get the component config. The component config will be passed
                // to the component constructor. If rendered on the server the
                // component config will be serialized to a JSON-like data
                // structure and stored in a "data-w-config" attribute.
                widgetConfig = getWidgetConfig(input, out);
            } else {
                widgetConfig = input.widgetConfig;
            }

            if (widgetConfig) {
                component.$c = widgetConfig;
            }

            if (getInitialBody) {
                // If we have component a component body then pass it to the template
                // so that it is available to the component tag and can be inserted
                // at the w-body marker
                componentBody = getInitialBody(input, out);
            }

            // If we do not have state then we need to go through the process
            // of converting the input to a component state, or simply normalizing
            // the input using getInitialProps

            if (getInitialProps) {
                // This optional method is used to normalize input state
                input = getInitialProps(input, out) || {};
            }

            if (getInitialState) {
                // This optional method is used to derive the component state
                // from the input properties
                component.state = componentState = getInitialState(input, out);
            }

            if (!componentBody) {
                // Default to using the nested content as the component body
                componentBody = input.renderBody;
            }
        }

        var isFakeComponent = false;

        if (!component) {
            isFakeComponent = true;
            component = {
                id: id,
                w_: {}
            };
        } else {
            componentState = component.U_ || componentState;
        }

        var templateInput = getTemplateData ? getTemplateData(componentState, input, out) : componentState || input || {};

        var componentDef = beginComponent(componentsContext, component, isSplit, parentComponentDef);

        // This is a hack, but we have to swap out the component instance stored with this node
        var vComponentNode = out.ac_;

        componentDef._a_ = isFakeComponent ? null : component;
        componentDef._c_ = isExisting;
        componentDef._P_ = true;
        componentDef.b = component.ad_ = componentBody || component.ad_ || "%FN";
        componentDef.c = function (widgetConfig) {
            component.$c = widgetConfig;
        };

        componentDef.t = function (typeName) {
            if (typeName) {
                vComponentNode._a_ = this._a_ = component = registry._n_(typeName, component.id);
            }
        };

        if (!isFakeComponent && !registry.ab_) {
            component.b_("_S_");
        }

        // Render the template associated with the component using the final template
        // data that we constructed
        templateRenderFunc(templateInput, out, componentDef, componentDef, component);

        if (customEvents && componentDef._a_) {
            if (registry.ab_) {
                componentDef.m_ = customEvents;
                componentDef.d_ = scope;
            } else {
                componentDef._a_.W_(customEvents, scope);
            }
        }

        endComponent(out, componentDef);
        componentsContext._p_ = parentComponentDef;
    };
}

module.exports = createRendererFunc;
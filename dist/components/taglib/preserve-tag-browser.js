var componentsUtil = require("../util");
var componentLookup = componentsUtil.a_;

module.exports = function render(input, out) {
    var componentsContext = out._r_;

    if (componentsContext) {
        // See if the DOM node with the given ID already exists.
        // If so, then reuse the existing DOM node instead of re-rendering
        // the children. We have to put a placeholder node that will get
        // replaced out if we find that the DOM node has already been rendered
        if (!("if" in input) || input["if"]) {
            var component = componentsContext._p_._a_;
            var globalComponentsContext = componentsContext.P_;
            var key = input.key;
            var componentId;

            if (key) {
                if (component.w_[key]) {
                    var bodyOnly = input.bodyOnly === true;
                    // Don't actually render anything since the element is already in the DOM,
                    // but keep track that the node is being preserved so that we can ignore
                    // it while transforming the old DOM
                    if (bodyOnly) {
                        globalComponentsContext._y_[key] = true;
                    } else {
                        // If we are preserving the entire DOM node (not just the body)
                        // then that means that we have need to render a placeholder to
                        // mark the target location. We can then replace the placeholder
                        // node with the existing DOM node
                        out.element("", null, key, null, 0, 8 /* FLAG_PRESERVE */
                        );
                        globalComponentsContext._x_[key] = true;
                    }

                    return;
                }
            } else if (componentId = input.cid) {
                var existingComponent = componentLookup[componentId];
                if (existingComponent) {
                    out.af_(existingComponent);
                    globalComponentsContext._z_[componentId] = true;
                    return;
                }
            }
        }
    }

    if (input.renderBody) {
        input.renderBody(out);
    }
};
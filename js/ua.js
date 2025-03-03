function createProperty(value) {
    var _value = value;
    function _get() {
        return _value;
    }
    // 重写setter函数
    function _set(v) {
        _value = v;
    }
    return {
        get: _get,
        set: _set,
    };
}

/**
 * 给定对象，创建或替换它的可写属性
 * @param {Object} objBase  e.g. window
 * @param {String} objScopeName    e.g. "navigator"
 * @param {String} propName    e.g. "userAgent"
 * @param {Any} initValue (optional)   e.g. window.navigator.userAgent
 */
function makePropertyWritable(objBase, objScopeName, propName, initValue) {
    let newProp, initObj;

    if (objBase && objScopeName in objBase && propName in objBase[objScopeName]) {
        if (typeof initValue === 'undefined') {
            initValue = objBase[objScopeName][propName];
        }
        newProp = createProperty(initValue);
        try {
            Object.defineProperty(objBase[objScopeName], propName, newProp);
        } catch (e) {
            initObj = {};
            initObj[propName] = newProp;
            try {
                objBase[objScopeName] = Object.create(objBase[objScopeName], initObj);
            } catch (e) {
                console.error(e);
            }
        }
    }
}

// console.log(window.navigator.userAgent);
makePropertyWritable(window, 'navigator', 'userAgent');
window.navigator.userAgent += '\nPorject: WillSat/bgmP(https://willsat.github.io/bgmP/)';
// console.log(window.navigator.userAgent);
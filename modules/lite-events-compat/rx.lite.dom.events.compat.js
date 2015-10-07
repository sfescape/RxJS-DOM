// Copyright (c) Microsoft, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (factory) {
  var objectTypes = {
    'function': true,
    'object': true
  };

  function checkGlobal(value) {
    return (value && value.Object === Object) ? value : null;
  }

  var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType) ? exports : null;
  var freeModule = (objectTypes[typeof module] && module && !module.nodeType) ? module : null;
  var freeGlobal = checkGlobal(freeExports && freeModule && typeof global === 'object' && global);
  var freeSelf = checkGlobal(objectTypes[typeof self] && self);
  var freeWindow = checkGlobal(objectTypes[typeof window] && window);
  var moduleExports = (freeModule && freeModule.exports === freeExports) ? freeExports : null;
  var thisGlobal = checkGlobal(objectTypes[typeof this] && this);
  var root = freeGlobal || ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) || freeSelf || thisGlobal || Function('return this')();

  // Because of build optimizers
  if (typeof define === 'function' && define.amd) {
    define(['rx-lite-compat'], function (Rx, exports) {
      return factory(root, exports, Rx);
    });
  } else if (typeof module === 'object' && module && module.exports === freeExports) {
    module.exports = factory(root, module.exports, require('rx-lite-compat'));
  } else {
    root.Rx = factory(root, {}, root.Rx);
  }
}.call(this, function (root, exp, Rx, undefined) {

  var ObservableBase = Rx.ObservableBase,
    CompositeDisposable = Rx.CompositeDisposable,
    dom = Rx.DOM || (Rx.DOM = {}),
    isFunction = Rx.helpers.isFunction,
    inherits = Rx.internals.inherits;

  root.Element && root.Element.prototype.attachEvent && !root.Element.prototype.addEventListener && (function () {
    function addMethod(name, fn) {
      Window.prototype[name] = HTMLDocument.prototype[name] = Element.prototype[name] = fn;
    }

    addMethod('addEventListener', function (type, listener) {
      var target = this;
      var listeners = target._c1_listeners = target._c1_listeners || {};
      var typeListeners = listeners[type] = listeners[type] || [];

      target.attachEvent('on' + type, typeListeners.event = function (e) {
        e || (e = root.event);

        var documentElement = target.document &&
          target.document.documentElement ||
          target.documentElement ||
          { scrollLeft: 0, scrollTop: 0 };

        e.currentTarget = target;
        e.pageX = e.clientX + documentElement.scrollLeft;
        e.pageY = e.clientY + documentElement.scrollTop;

        e.preventDefault = function () {
          e.bubbledKeyCode = e.keyCode;
          if (e.ctrlKey) {
            try {
              e.keyCode = 0;
            } catch (e) { }
          }
          e.defaultPrevented = true;
          e.returnValue = false;
          e.modified = true;
          e.returnValue = false;
        };

        e.stopImmediatePropagation = function () {
          immediatePropagation = false;
          e.cancelBubble = true;
        };

        e.stopPropagation = function () {
          e.cancelBubble = true;
        };

        e.relatedTarget = e.fromElement || null;
        e.target = e.srcElement || target;
        e.timeStamp = +new Date();

        // Normalize key events
        switch(e.type) {
          case 'keypress':
            var c = ('charCode' in e ? e.charCode : e.keyCode);
            if (c === 10) {
              c = 0;
              e.keyCode = 13;
            } else if (c === 13 || c === 27) {
              c = 0;
            } else if (c === 3) {
              c = 99;
            }
            e.charCode = c;
            e.keyChar = e.charCode ? String.fromCharCode(e.charCode) : '';
            break;
        }

        var copiedEvent = {};
        for (var prop in e) {
          copiedEvent[prop] = e[prop];
        }

        for (var i = 0, typeListenersCache = [].concat(typeListeners), typeListenerCache, immediatePropagation = true; immediatePropagation && (typeListenerCache = typeListenersCache[i]); ++i) {
          for (var ii = 0, typeListener; typeListener = typeListeners[ii]; ++ii) {
            if (typeListener === typeListenerCache) { typeListener.call(target, copiedEvent); break; }
          }
        }
      });

      typeListeners.push(listener);
    });

    addMethod('removeEventListener', function (type, listener) {
      var target = this;
      var listeners = target._c1_listeners = target._c1_listeners || {};
      var typeListeners = listeners[type] = listeners[type] || [];

      for (var i = typeListeners.length - 1, typeListener; typeListener = typeListeners[i]; --i) {
        if (typeListener === listener) { typeListeners.splice(i, 1); break; }
      }

      !typeListeners.length &&
        typeListeners.event &&
        target.detachEvent('on' + type, typeListeners.event);
    });

    addMethod('dispatchEvent', function (e) {
      var target = this;
      var type = e.type;
      var listeners = target._c1_listeners = target._c1_listeners || {};
      var typeListeners = listeners[type] = listeners[type] || [];

      try {
        return target.fireEvent('on' + type, e);
      } catch (err) {
        return typeListeners.event && typeListeners.event(e);
      }
    });

    function ready() {
      if (ready.interval && document.body) {
        ready.interval = clearInterval(ready.interval);

        document.dispatchEvent(new CustomEvent('DOMContentLoaded'));
      }
    }

    ready.interval = setInterval(ready, 1);

    root.addEventListener('load', ready);
  }());

  (!root.CustomEvent || typeof root.CustomEvent === 'object') && (function() {
  	function CustomEvent (type, params) {
  		var event;
  		params = params || { bubbles: false, cancelable: false, detail: undefined };

  		try {
  			event = document.createEvent('CustomEvent');
  			event.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  		} catch (error) {
  			event = document.createEvent('Event');
  			event.initEvent(type, params.bubbles, params.cancelable);
  			event.detail = params.detail;
  		}

  		return event;
  	}

    root.CustomEvent && (CustomEvent.prototype = root.CustomEvent.prototype);
    root.CustomEvent = CustomEvent;
  }());

  function CreateListenerDisposable(element, name, handler, useCapture) {
    this._e = element;
    this._n = name;
    this._fn = handler;
    this._u = useCapture;
    this._e.addEventListener(this._n, this._fn, this._u);
    this.isDisposed = false;
  }

  CreateListenerDisposable.prototype.dispose = function () {
    if (!this.isDisposed) {
      this.isDisposed = true;
      this._e.removeEventListener(this._n, this._fn, this._u);
    }
  };

  function createListener (element, name, handler, useCapture) {
    if (element.addEventListener) {
      return new CreateListenerDisposable(element, name, handler, useCapture);
    }
    throw new Error('No listener found');
  }

  function createEventListener (el, eventName, handler, useCapture) {
    var disposables = new CompositeDisposable();

    // Asume NodeList or HTMLCollection
    var toStr = Object.prototype.toString;
    if (toStr.call(el) === '[object NodeList]' || toStr.call(el) === '[object HTMLCollection]') {
      for (var i = 0, len = el.length; i < len; i++) {
        disposables.add(createEventListener(el.item(i), eventName, handler, useCapture));
      }
    } else if (el) {
      disposables.add(createListener(el, eventName, handler, useCapture));
    }
    return disposables;
  }

  var FromEventObservable = (function(__super__) {
    inherits(FromEventObservable, __super__);
    function FromEventObservable(element, eventName, selector, useCapture) {
      this._e = element;
      this._n = eventName;
      this._fn = selector;
      this._uc = useCapture;
      __super__.call(this);
    }

    function createHandler(o, fn) {
      return function handler() {
        var results = arguments[0];
        if (fn) {
          var results = tryCatch(fn).apply(null, arguments);
          if (results === errorObj) { return o.onError(results.e); }
        }
        o.onNext(results);
      };
    }

    FromEventObservable.prototype.subscribeCore = function (o) {
      return createEventListener(
        this._e,
        this._n,
        createHandler(o, this._fn),
        this._uc);
    };

    return FromEventObservable;
  }(ObservableBase));

  /**
   * Creates an observable sequence by adding an event listener to the matching DOMElement or each item in the NodeList.
   * @param {Object} element The DOMElement or NodeList to attach a listener.
   * @param {String} eventName The event name to attach the observable sequence.
   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
   * @param {Boolean} [useCapture] If true, useCapture indicates that the user wishes to initiate capture. After initiating capture, all events of the specified type will be dispatched to the registered listener before being dispatched to any EventTarget beneath it in the DOM tree. Events which are bubbling upward through the tree will not trigger a listener designated to use capture
   * @returns {Observable} An observable sequence of events from the specified element and the specified event.
   */
  var fromEvent = dom.fromEvent = function (element, eventName, selector, useCapture) {
    var selectorFn = isFunction(selector) ? selector : null;
    typeof selector === 'boolean' && (useCapture = selector);
    typeof useCapture === 'undefined' && (useCapture = false);
    return new FromEventObservable(element, eventName, selectorFn, useCapture).publish().refCount();
  };

  (function () {
    var events = 'blur focus focusin focusout load resize scroll unload click dblclick ' +
      'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
      'change select submit keydown keypress keyup error contextmenu input';

    if (root.PointerEvent) {
      events += ' pointerdown pointerup pointermove pointerover pointerout pointerenter pointerleave';
    }

    if (root.TouchEvent) {
      events += ' touchstart touchend touchmove touchcancel';
    }

    events = events.split(' ');

    for(var i = 0, len = events.length; i < len; i++) {
      (function (e) {
        dom[e] = function (element, selector, useCapture) {
          return fromEvent(element, e, selector, useCapture);
        };
      }(events[i]))
    }
  }());

  var ReadyObservable = (function (__super__) {
    inherits(ReadyObservable, __super__);
    function ReadyObservable() {
      __super__.call(this);
    }

    function createHandler(o) {
      return function handler() {
        o.onNext();
        o.onCompleted();
      };
    }

    ReadyObservable.prototype.subscribeCore = function (o) {
      return new ReadyDisposable(o, createHandler(o));
    };

    function ReadyDisposable(o, fn) {
      this._o = o;
      this._fn = fn;
      this._addedHandlers = false;
      this.isDisposed = false;

      if (root.document.readyState === 'complete') {
        setTimeout(this._fn, 0);
      } else {
        this._addedHandlers = true;
        root.document.addEventListener( 'DOMContentLoaded', this._fn, false );
      }
    }

    ReadyDisposable.prototype.dispose = function () {
      if (!this.isDisposed) {
        this.isDisposed = true;
        root.document.removeEventListener( 'DOMContentLoaded', this._fn, false );
      }
    };

    return ReadyObservable;
  }(ObservableBase));

  /**
   * Creates an observable sequence when the DOM is loaded
   * @returns {Observable} An observable sequence fired when the DOM is loaded
   */
  dom.ready = function () {
    return new ReadyObservable();
  };

  return Rx;
}));
const defaults: any = {
  // Extra small devices (phones)
  xs: {
    min: 0,
    max: 767
  },
  // Small devices (tablets)
  sm: {
    min: 768,
    max: 991
  },
  // Medium devices (desktops)
  md: {
    min: 992,
    max: 1199
  },
  // Large devices (large desktops)
  lg: {
    min: 1200,
    max: Infinity
  }
};

const util: any = {
  each: function (obj: Array<any>, fn) {
    let continues;

    for (const i in obj) {
      if (typeof obj !== 'object' || obj.hasOwnProperty(i)) {
        continues = fn(i, obj[i]);
        if (continues === false) {
          break; // allow early exit
        }
      }
    }
  },

  isFunction: function (obj) {
    return typeof obj === 'function' || false;
  },

  extend: function (obj, source) {
    for (const property of Object.keys(source)) {
      obj[property] = source[property];
    }
    return obj;
  }
};

class Callbacks {
  private list: any;
  private length: number;

  constructor() {
    this.length = 0;
    this.list = [];
  }

  add(fn, data, one = false) {
    this.list.push({
      fn,
      data: data,
      one: one
    });

    this.length++;
  }

  remove(fn) {
    for (let i = 0; i < this.list.length; i++) {
      if (this.list[i].fn === fn) {
        this.list.splice(i, 1);
        this.length--;
        i--;
      }
    }
  }

  empty() {
    this.list = [];
    this.length = 0;
  }

  call(caller, i, fn = null) {
    if (!i) {
      i = this.length - 1;
    }
    const callback = this.list[i];

    if (util.isFunction(fn)) {
      fn.call(this, caller, callback, i);
    } else if (util.isFunction(callback.fn)) {
      callback.fn.call(caller || window, callback.data);
    }

    if (callback.one) {
      delete this.list[i];
      this.length--;
    }
  }

  fire(caller, fn = null) {
    for (const i in this.list) {
      if (this.list.hasOwnProperty(i)) {
        this.call(caller, i, fn);
      }
    }
  }
}

const ChangeEvent: any = {
  current: null,
  callbacks: new Callbacks(),
  trigger(size) {
    const previous = this.current;
    this.current = size;
    this.callbacks.fire(size, (caller, callback) => {
      if (util.isFunction(callback.fn)) {
        callback.fn.call({
          current: size,
          previous
        }, callback.data);
      }
    });
  },
  one(data, fn) {
    return this.on(data, fn, true);
  },
  on(data, fn, /*INTERNAL*/ one = false) {
    if (typeof fn === 'undefined' && util.isFunction(data)) {
      fn = data;
      data = undefined;
    }
    if (util.isFunction(fn)) {
      this.callbacks.add(fn, data, one);
    }
  },
  off(fn) {
    if (typeof fn === 'undefined') {
      this.callbacks.empty();
    }
  }
};

class MediaQuery {

  name: any;
  media: any;
  callbacks: any;
  mql: any;
  mqlListener: any;
  constructor(name, media) {
    this.name = name;
    this.media = media;

    this.initialize();
  }

  initialize() {
    this.callbacks = {
      enter: new Callbacks(),
      leave: new Callbacks()
    };

    this.mql = (window.matchMedia && window.matchMedia(this.media)) || {
        matches: false,
        media: this.media,
        addListener: function () {
          // do nothing
        },
        removeListener: function () {
          // do nothing
        }
      };

    const that = this;
    this.mqlListener = mql => {
      const type = (mql.matches && 'enter') || 'leave';

      that.callbacks[type].fire(that);
    };
    this.mql.addListener(this.mqlListener);
  }

  on(types, data, fn, one = false) {
    if (typeof types === 'object') {
      for (const type in types) {
        if (types.hasOwnProperty(type)) {
          this.on(type, data, types[type], one);
        }
      }
      return this;
    }

    if (typeof fn === 'undefined' && util.isFunction(data)) {
      fn = data;
      data = undefined;
    }

    if (!util.isFunction(fn)) {
      return this;
    }

    if (typeof this.callbacks[types] !== 'undefined') {
      this.callbacks[types].add(fn, data, one);

      if (types === 'enter' && this.isMatched()) {
        this.callbacks[types].call(this);
      }
    }


    return this;
  }

  one(types, data, fn) {
    return this.on(types, data, fn, true);
  }

  off(types, fn) {
    let type = void 0;

    if (typeof types === 'object') {
      for (type in types) {
        if (types.hasOwnProperty(type)) {
          this.off(type, types[type]);
        }
      }
      return this;
    }

    if (typeof types === 'undefined') {
      this.callbacks.enter.empty();
      this.callbacks.leave.empty();
    } else if (types in this.callbacks) {
      if (fn) {
        this.callbacks[types].remove(fn);
      } else {
        this.callbacks[types].empty();
      }
    }

    return this;
  }

  isMatched() {
    return this.mql.matches;
  }

  destroy() {
    this.off(null, null);
  }
}

let MediaBuilder: any = {
  min: function (min, unit = 'px') {
    return `(min-width: ${min}${unit})`;
  },
  max: function (max, unit = 'px') {
    return `(max-width: ${max}${unit})`;
  },
  between: function (min, max, unit = 'px') {
    return `(min-width: ${min}${unit}) and (max-width: ${max}${unit})`;
  },
  get: function (min, max, unit = 'px') {
    if (min === 0) {
      return this.max(max, unit);
    }
    if (max === Infinity) {
      return this.min(min, unit);
    }
    return this.between(min, max, unit);
  }
};

const info = {
  version: '1.0.4'
};

let sizes = {};
let unionSizes = {};

let Breakpoints: any = (<any>window).Breakpoints = function (...args) {
  (<any>Breakpoints).define.apply(Breakpoints, args);
};

let Breakpoints$1: any;
Breakpoints$1 = Breakpoints;


class Size extends MediaQuery {
  changeHander: any;

  min: any;
  max: any;
  unit: any;
  changeListener: any;
  constructor(name, min = 0, max = Infinity, unit = 'px') {
    let media = MediaBuilder.get(min, max, unit);
    super(name, media);

    this.min = min;
    this.max = max;
    this.unit = unit;

    const that = this;
    this.changeListener = () => {
      if (that.isMatched()) {
        ChangeEvent.trigger(that);
      }
    };
    if (this.isMatched()) {
      ChangeEvent.current = this;
    }

    this.mql.addListener(this.changeListener);
  }

  destroy() {
    this.off(null, null);
    this.mql.removeListener(this.changeHander);
  }
}

class UnionSize extends MediaQuery {
  constructor(names) {
    let sizesArray = [];
    let media = [];

    util.each(names.split(' '), (i, name) => {
      let size = Breakpoints$1.get(name);
      if (size) {
        sizesArray.push(size);
        media.push(size.media);
      }
    });

    super(names, media.join(','));
  }
}

Breakpoints.defaults = defaults;

Breakpoints = util.extend(Breakpoints, {
  version: info.version,
  defined: false,
  define(values, options = {}) {
    if (this.defined) {
      this.destroy();
    }

    if (!values) {
      values = Breakpoints.defaults;
    }

    this.options = util.extend(options, {
      unit: 'px'
    });

    for (const size in values) {
      if (values.hasOwnProperty(size)) {
        this.set(size, values[size].min, values[size].max, this.options.unit);
      }
    }

    this.defined = true;
  },

  destroy() {
    util.each(sizes, (name, size) => {
      size.destroy();
    });
    sizes = {};
    ChangeEvent.current = null;
  },

  is(size) {
    const breakpoint = this.get(size);
    if (!breakpoint) {
      return null;
    }

    return breakpoint.isMatched();
  },

  /* get all size name */
  all() {
    let names = [];
    util.each(sizes, name => {
      names.push(name);
    });
    return names;
  },

  set: function (name, min = 0, max = Infinity, unit = 'px') {
    let size = this.get(name);
    if (size) {
      size.destroy();
    }

    sizes[name] = new Size(name, min, max, unit);
    return sizes[name];
  },

  get: function (size) {
    if (sizes.hasOwnProperty(size)) {
      return sizes[size];
    }

    return null;
  },

  getUnion(sizesObject: any) {
    if (unionSizes.hasOwnProperty(sizesObject)) {
      return unionSizes[sizesObject];
    }

    unionSizes[sizesObject] = new UnionSize(sizesObject);

    return unionSizes[sizesObject];
  },

  getMin(size) {
    const obj = this.get(size);
    if (obj) {
      return obj.min;
    }
    return null;
  },

  getMax(size) {
    const obj = this.get(size);
    if (obj) {
      return obj.max;
    }
    return null;
  },

  current() {
    return ChangeEvent.current;
  },

  getMedia(size) {
    const obj = this.get(size);
    if (obj) {
      return obj.media;
    }
    return null;
  },

  on(sizesObject, types, data, fn, /*INTERNAL*/ one = false) {
    sizesObject = sizesObject.trim();

    if (sizesObject === 'change') {
      fn = data;
      data = types;
      return ChangeEvent.on(data, fn, one);
    }
    if (sizesObject.includes(' ')) {
      let union = this.getUnion(sizesObject);

      if (union) {
        union.on(types, data, fn, one);
      }
    } else {
      let size = this.get(sizesObject);

      if (size) {
        size.on(types, data, fn, one);
      }
    }

    return this;
  },

  one(sizesObject, types, data, fn) {
    return this.on(sizesObject, types, data, fn, true);
  },

  off(sizesObject, types, fn) {
    sizesObject = sizesObject.trim();

    if (sizesObject === 'change') {
      return ChangeEvent.off(types);
    }

    if (sizesObject.includes(' ')) {
      let union = this.getUnion(sizesObject);

      if (union) {
        union.off(types, fn);
      }
    } else {
      let size = this.get(sizesObject);

      if (size) {
        size.off(types, fn);
      }
    }

    return this;
  }
});

export { Breakpoints }


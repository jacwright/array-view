
(function(undefined) {

  // Calls Object.definePropert(y,ies) with configurable:true on all properties
  function define(obj, key, value) {
    if (typeof key == 'object') {
      Object.keys(key).forEach(function(name) {
        define(obj, name, key[name]);
      });
    } else {
      Object.defineProperty(obj, key, {
        configurable: true,
        value: value
      })
    }
  }
  
  // Add Array.prototype.view to create new views and
  // Array.prototype.updateViews to update all the views attached
  define(Array.prototype, {
    view: function view() {
      return createView(this);
    },
    updateViews: function updateViews() {
      if (!Array.isArray(this._views)) return false;
      this._views.forEach(function(view) {
        view.update();
      });
      return true;
    }
  });

  // create a new view on the source array (which may be a view itself)
  function createView(source) {
    var view = [];
    if (!source._views) initSource(source);
    initView(source, view);
    return view;
  }

  // add a _views array for updates and wrap the modifying functions
  function initSource(source) {
    define(source, '_views', []);
    define(source, modifiers);
  }


  // When the source is modified the views need to be updated
  function wrapModifier(modifier) {
    return function() {
      var results = modifier.apply(this, arguments);
      this.updateViews();
      return results;
    };
  }

  var proto = Array.prototype;
  var modifiers = {
    push: wrapModifier(proto.push),
    pop: wrapModifier(proto.pop),
    shift: wrapModifier(proto.shift),
    unshift: wrapModifier(proto.unshift),
    splice: wrapModifier(proto.splice)
  };

  // add view functions to the view array
  function initView(source, view) {
    define(view, '_source', source);
    source._views.push(view);
    define(view, viewMethods);
    bindModifiers(source, view);
    view.update();
  }

  // bind the view's modifiers to the source, never modify the view
  function bindModifiers(source, view) {
    Object.keys(modifiers).forEach(function(modifier) {
      define(view, modifier, source[modifier].bind(source));
    });
  }

  // Remove an item from an array
  function remove(array, item) {
    var index = array.indexOf(item);
    if (index != -1) {
      array.splice(index, 1);
      return index;
    }
  }

  var sortDir = {
    asc: 1,
    desc: -1
  }

  // create a sort function from arguments, see comments on `sort` below
  function createSort(sorts) {
    if (sorts[1] == 'asc' || sorts[1] == 'desc') sorts = [sorts];
    return function(a, b) {
      for (var i = 0; i < sorts.length; i++) {
        var field = sorts[i];
        var dir = 1;
        if (Array.isArray(field)) {
          dir = sortDir[field[1]] || field[1];
          field = field[0];
        }
        var valueA = a;
        var valueB = b;
        var fields = field.split('.');
        fields.forEach(function(field) {
          valueA = valueA != null ? valueA[field] : null;
          valueB = valueB != null ? valueB[field] : null;
        });
        // handle nulls as less than
        if (valueB != null && valueA == null) return dir;
        else if (valueA != null && valueB == null) return -dir;
        else if (valueA > valueB) return dir;
        else if (valueB > valueA) return -dir;
      }
      return 0;
    }
  }


  var viewMethods = {

    // Adds a persistent filter function which takes a single argument, `item`,
    // and returns true or false if item should be allowed in the array. More
    // than one filter may be added and `name` (optional) can be used to remove
    // the filter later.
    filter: function filter(name, filter) {
      if (!this._filters) define(this, '_filters', []);
      if (typeof name == 'function') {
        filter = name;
        name = null;
      }
      if (typeof filter != 'function') return this;
      if (name) this._filters[name] = filter;
      this._filters.push(filter);
      return this.update();
    },

    // Removea a persistent filter which has been added. `filter` may be the
    // filter function or the name if `name` was used in `addFilter`.
    removeFilter: function removeFilter(filter) {
      if (!this._filters) return this;
      if (typeof filter == 'string') {
        var name = filter;
        filter = this._filters[name];
        delete this._filters[name];
      }
      if (typeof filter != 'function') return this;
      remove(this._filters, filter);
      return this.update();
    },

    // Sets a persistent sort on the array. Objects added or removed will
    // maintain the sort order of this sort function. Pass null to remove the
    // sort. You may use a sort function as Array.prototype.sort takes, or you
    // may use a special array view as the following examples:
    // ```
    // view.sort('dateCreated', 'desc');
    // view.sort('lastName', 'firstName', ['age', 'desc']);
    // view.sort('comments.length', ['postDate', 'desc']);
    // view.sort(['dateCreated', 'desc'], ['title', 'asc']);
    // ```
    // When only sorting by one property, you may use asc/desc as the second
    // parameter. 'asc' is always the default and is not necessary. When sorting
    // by multiple properties an array is required to add the sort order 'desc'.
    // chained properties (such as name.first or comments.length) may be as deep
    // as needed and will null-terminate, so no errors will occur. A null will
    // be treated as LESS THAN a non-null value.
    sort: function sort(sort) {
      if (sort && typeof sort != 'function') {
        sort = createSort(proto.slice(arguments));
      }
      define(this, '_sort', sort || true);
      return this.update();
    },

    removeSort: function removeSort() {
      define(this, '_sort', undefined);
      return this.update();
    },

    // Paginates the view by splitting it up into pages. Each page has
    // `pageSize` items in it--or fewer if it is the last page. `page` is the
    // initial page the view will display (default is 1). The page can be set
    // later with the `page` method. Pass in null to remove pagination.
    paginate: function paginate(pageSize, page) {
      define(this, '_pageSize', pageSize);
      define(this, '_page', page || 1);
      return this.updatePagination();
    },

    // Sets or gets the page number of a paginated array view. If you pass in
    // a number it will set it, otherwise it will return the current page
    // number. Pages are 1-based, not zero-based. I.e. the first page is page 1.
    pageNumber: function pageNumber(page) {
      if (typeof page != 'undefined') {
        define(this, '_page', page || 1);
        return this.updatePagination();
      } else if (this._pageSize) {
        return this._page || 1;
      } else {
        return 1;
      }
    },

    // Gets the page count for a paginated array view.
    pageCount: function pageCount() {
      if (!this._pageSize) return 1;
      return Math.ceil(this._unpaginated.length / this._pageSize);
    },

    // Returns the page number which an item will appear on for a paingated
    // array view.
    itemPageNumber: function itemsPageNumber(item) {
      var index = this.indexOf(item);
      if (index == -1) return 0;
      if (!this._pageSize) return 1;
      return Math.floor(index / this._pageSize) + 1;
    },

    // Updates the view to reflect the latest state. This array will contain
    // only items from the source that haven't been filtered if any filters were
    // added, in the sort order that has been set if any, and only the items on
    // the current page if pagination was set.
    update: function update() {
      var array = this._source.slice();
      if (this._filters) this._filters.forEach(function(filter) {
        array = array.filter(filter);
      });
      if (this._sort) array.sort(this._sort);
      define(this, '_unpaginated', array);
      return this.updatePagination();
    },

    updatePagination: function updatePagination() {
      var array = this._unpaginated;
      if (this._pageSize) {
        var count = this.pageCount();
        define(this, '_page', Math.min(count, Math.max(1, this._page || 1)));
        var begin = (this._page - 1) * this._pageSize;
        var end = this._page * this._pageSize;
        array = array.slice(begin, end);
      }

      this.length = 0;
      // Use proto.push because this.push is bound to the source array
      proto.push.apply(this, array);
      // Allow views to have views
      this.updateViews();
      return this;
    }
  }

})()
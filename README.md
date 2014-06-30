array-view provides collection-like functionality to standard arrays. This
allows you to have persistent sorting, filters, and even pagination on an array,
while at the same time keeping the Array object type. This allows you to work
with libraries that expect arrays, such as Angular.js in ng-repeat.

Note: views are meant for displaying array's on a page within a framework such
as Angular.js. They are not optimized for heavy array processing and would not
be a good choice in something that alters the array's constantly, such as
multiple times every frame.

How it works
------------

```js
var view = myarray.view()
```

This creates a new array that is bound to the source array. Initially it is an
exact copy of the source array, and stays in sync with the source array as long
as methods are used for altering the arrays.

```js
myarray.push(newItem);
myarray.shift(oldItem);
```

These methods (along with `pop`, `unshift`, and `splice`) will automatically
update the view. In addition, using the same methods on the view will `push` or
`pop` the item from the source array, keeping a single source of truth.

A view can be made from another view as well.

```js
var paginatedView = filteredView.view();
```

Keeping two arrays in sync isn't necessarily useful. array-view really starts to
become valuable when you use it's filtering, sorting, and pagnation features.

### Filters

The views created with array-view persist filters and sorting that are done on
them, while still maintaining a link to the source array.

```js
var src = [1, 5, 8, -2, 9, -4, 2];
var view = src.view();
view.filter(function(item) {
  return item >= 0;
}); // view = [1, 5, 6, 9, 2]

src.push(-4);
src.push(8);
view; // view = [1, 5, 9, 2, 8]
```

As items are added to the source array, they will show up in the view array,
unless they do not pass the filter. Also note, the return from a call to
`filter` is the view itself, since it is doing a filter on itself (this is
similar to how the native array `sort` method works).

Filters may be removed by reference or by name if you pass in a name when adding
them.

```js
view.filter('positive', function(item) {
  return item >= 0;
}).filter(function notNull(item) {
  return item != null;
});


view.removeFilter('positive').removeFilter(notNull);
```

### Sort

Views may also have a sort applied to them. They optionally follow the same API
as the native `sort` method, taking a function with two arguments that returns
a positive, negative, or zero number. The difference is that the sort persists,
so any new items added to the original array appear in the view in sorted order,
automatically.

```js
var source = [4, 3, 17, 1, -3];
var view = source.view();
view.sort(); // [-3, 1, 17, 3, 4]; note that the default sort isn't numerical
source.push(2);
view; // [-3, 1, 17, 2, 3, 4];

view.sort(function(a, b) {
  return a - b;
}); // [-3, 1, 2, 3, 4, 17];
```

In addition to the built-in sorting functionality, array-view provides a sorting
API to sort objects (the most common items in arrays used by domain models). You
may sort ascending or descending on one or more properties, and the properties
may be chained using the dot-syntax. Below are some examples.

```js
view.sort('dateCreated', 'desc');
view.sort('lastName.toLowerCase()', 'firstName.toLowerCase()', ['age', 'desc']);
view.sort('comments.length', ['postDate', 'desc']);
view.sort(['dateCreated', 'desc'], ['title', 'asc']);

view.removeSort();
```

When only sorting by one property, you may use asc/desc as the second parameter.
'asc' is always the default and is not necessary. When sorting by multiple
properties an array is required to add the sort order 'desc'. Chained properties
(such as name.first or comments.length) may be as deep as needed and will null-
terminate so no errors will occur. A null will be treated as LESS THAN a non-
null value. Functions may even be used. If anything more complex than this is
required, just use a sort function.

Note that although the sort API allows you to sort on multiple fields, there is
only one actual sort on a view, so subsequent calls to `sort` will override the
previous sorts, and `removeSort()` takes no arguments, only removing the current
sort.

### Pagination

Views provide pagination on top of their filtering and sorting capabilities. All
of these features may be used on the same view at once. Filters will be applied
first, then sorting, then pagination, providing the the correct items to show
up on each page.

```js
var source = [3, 2, 4, 1, 5, 8, 9, 7, 6];
var view = source.view().sort();
view.paginate(5);
view; // [1, 2, 3, 4, 5];
view.pageNumber(); // 1
view.pageNumber(2);
view; // [6, 7, 8, 9];
view.pageCount(); // 2
```

This paginates a view with 5 items per page. You can change the page number by
calling `pageNumber(num)` and get the page number by calling the same without
any arguments. `pageCount()` gives the current number of pages the array fits
into. Using these values you should be able to implement paging naviation for
selecting the page you need.

Sometimes it is useful to find the page a particular item is on. For example, if
you want to jump to it in a large paginated array, you may go to the page it is
on.

```js
var page = view.itemPageNumber(7);
view.pageNumber(page); // [6, 7, 8, 9];
```

If the item doesn't exist in the view because either it isn't in the source
array or it is filtered out from the view, `itemPageNumber` will return `0`. The
pages start at 1 and go up from there. They are not zero-based like an array's
indices.

### Cleanup

When done with a view you can detach it from the source array for garbage
collection. If both view and source arrays are no longer referenced they should
both be collected by the runtime and no detach will be needed.

```js
view.detach();
```

Other Uses
----------

While often array-view may be used as a view onto a source array, it may also be
use as an array that persists its filters and sorts or adds pagination. You
don't need to keep a handle on the source array to use the view.

```js
var friends = [].view();
friends.sort('lastName.toLowerCase()', 'firstName.toLowerCase()')

friends.push(friend1, friend2, friend3); // remains sorted at all times
```

License
-------

MIT License

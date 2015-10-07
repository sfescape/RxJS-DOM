  var Observable = Rx.Observable,
    ObservableBase = Rx.ObservableBase,
    observableProto = Observable.prototype,
    AnonymousObservable = Rx.AnonymousObservable,
    AbstractObserver = Rx.internals.AbstractObserver,
    observerCreate = Rx.Observer.create,
    observableCreate = Rx.Observable.create,
    disposableCreate = Rx.Disposable.create,
    Disposable = Rx.Disposable,
    CompositeDisposable = Rx.CompositeDisposable,
    BinaryDisposable = Rx.BinaryDisposable,
    SingleAssignmentDisposable = Rx.SingleAssignmentDisposable,
    Subject = Rx.Subject,
    Scheduler = Rx.Scheduler,
    dom = Rx.DOM = {},
    hasOwnProperty = {}.hasOwnProperty,
    noop = Rx.helpers.noop,
    isFunction = Rx.helpers.isFunction,
    inherits = Rx.internals.inherits;

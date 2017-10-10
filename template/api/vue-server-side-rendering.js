const Vue = require('vue');
const errors = require('feathers-errors')

/**
 * Prepare mock browser so references to window, document, Element, and navigator don't break the SSR inside of Quasar
 */
// const { JSDOM } = require('jsdom');
// global.window = new JSDOM().window;
// var MockBrowser = require('mock-browser').mocks.MockBrowser;
// var mock = new MockBrowser({ window });
// global.document = mock.getDocument();
// global.window = mock.getWindow();
// global.navigator = mock.getNavigator();
// global.Element = function() {}
// global.XMLHttpRequest = function() {
//   this.send = () => {}
// }

module.exports = function(context) {

  return new Promise((resolve, reject) => {

    var { app, router } = require('../src/main.js').default;

    // `router.push()` will load the url provided by our context and getMatchedComponents will retrieve all the associated parent and child components related to that url
    router.push(context.url);

    router.onReady(() => {
      let matchedComponents = router.getMatchedComponents();

      // no matched routes
      if (!matchedComponents.length) {

        return Promise.reject(new errors.NotFound(`There are no vue components for this url: ${context.url}`));
      }

      // We wait for the "ssr" hook to finish it's promises before rendering. You can run an isomorphic ajax library such as axios or isomorphic-fetch in it. It should be a function You that returns a promise and when it resolves it will render the html. This allows you to fetch all your ajax data before the html is sent and save the results to a store

      return Promise.all(matchedComponents.map(component => {
        if(component.asyncData && typeof component.asyncData === 'function') {
          return component.asyncData({
            // store,
            route: router.currentRoute
          });
        } else {
          return undefined
        }
      }))
        .then(() => {
          // If you have a vuex or vue stash store, save the results to context.state
          // context.state = store.state;
          return app;
        })
        .then(resolve)
        .catch(reject);
    })
  })
};

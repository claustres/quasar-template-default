const isProd = process.env.NODE_ENV === 'production';
const path = require('path');
const fs = require('fs');
const serverRenderer = require('vue-server-renderer');

const options = isProd ? {
  cache: require('lru-cache')({
    max: 1000,
    maxAge: 1000 * 60 * 15
  })
}: undefined;

module.exports = function() {

  const app = this;

  const rendererPath = path.join( 
    app.get('ssr'),
    'compiled-ssr.js' 
  );
  
  // The index.html file will need to have css files separated from the js files to avoid a page flicker.
  const indexPath = path.join(app.get('public'), 'index.html');
    
  let indexHTML;
  try {
    indexHTML = fs.readFileSync(indexPath, 'utf8');
  } catch(err) {
    throw new Error(`
      **dist/index.html is missing.**
      Run '$ quasar build' before running the server.
    `);
  } 

  // We read the file generated by webpack with the compiled app
  let renderCode;
  try {
    renderCode = fs.readFileSync(rendererPath, 'utf8');
  } catch(err) {
    throw new Error(`
      **compiled-ssr.js is missing.**

      Please compile your ssr files by enabling 

      'renderSSR: true' in 'config/index.js' 

      And run '$ quasar build' before running the server.
    `);
  }

  let renderer = serverRenderer.createBundleRenderer(renderCode, options);

  // For all routes load the index.html file, assets should be caught by feathers.static middleware
  app.get('/*', (req, res) => {

    if (!isProd) {
      renderCode = fs.readFileSync(rendererPath, 'utf8');
      renderer = serverRenderer.createBundleRenderer(renderCode, options);
    }

    // We need the req.url to know which vue component to render
    var context = { url: req.url };

    renderer.renderToString(context, (err, html) => {

      if (err) {
        console.warn('Error with SSR:', err);
        return res.status(500).send(indexHTML);
      }

      // We replace #q-app with the rendered html

      // If devs have a store that was modified during the render they can save the result in context.initialState and it will be saved to window.init_state
      html = indexHTML
        .replace('<div id="q-app"></div>', html)
        .replace('"init_state"', JSON.stringify(context.initialState));

      return res.status(200).send(html);
    });

  });
};

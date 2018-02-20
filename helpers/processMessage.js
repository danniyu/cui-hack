'use strict';

const functions = require('firebase-functions');
const axios = require('axios');

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  if (request.body.result) {
    processV1Request(request, response);
  } else {
    console.log('Invalid Request');
    return response.status(400).end('Invalid Webhook Request (expecting v1 webhook request)');
  }
});

function processV1Request (request, resp) {

  let action = request.body.result.action; // https://dialogflow.com/docs/actions-and-parameters
  let parameters = request.body.result.parameters; // https://dialogflow.com/docs/actions-and-parameters
  let inputContexts = request.body.result.contexts; // https://dialogflow.com/docs/contexts
  let requestSource = (request.body.originalRequest) ? request.body.originalRequest.source : undefined;

  const actionHandlers = {
    'input.show-items': () => {
      showItems(inputContexts, parameters);
    },
    'input.show-more-items': () => {
      showMoreItems(inputContexts);
    }
  };
  actionHandlers[action]();

  function fetchImage(listingId, imageId) {
    return ''; //fetch request url, deleted for public repo
  }

  function sendResponse(giftItem, giftReceiver, offset, maxPrice, outputContexts) {
    let query = '';
    if (giftItem) {
      query = giftItem;
    } else {
      query = 'gifts';
    }
    if (giftReceiver) {
      query += ' for ' + giftReceiver;
    }

    let requestConfig = {
      baseURL: '', //base api url, deleted for public repo
      url: '/v3/public/search/listings?keywords=' + encodeURIComponent(query) + "&limit=4&offset="+ offset + "&max_price=" + maxPrice,
      method: 'get',
      headers: {
        'x-api-key': '' //api key, deleted for public repo
      }
    };

    axios(requestConfig).then(function(response) {
      let data = response.data;

      if (data.results) {

        let giftResults = [];
        let imagePromises = [];

        data.results.forEach(function(listing) {

          let listingId = listing.listing_id;
          let imageId = listing.Images[0].listing_image_id;
          let imageUrl = '';
          let fetchImagePromise = fetchImage(listingId, imageId);
          imagePromises.push(fetchImagePromise);
        });

        axios.all(imagePromises).then(values => {
          data.results.forEach(function(listing2, index) {
            let item =
            {
              'title': listing2.title,
              'image_url': values[index].data.results[0].url_fullxfull,
              'subtitle': '',
              'default_action': {
                'type': 'web_url',
                'url': listing2.url
              },
              'buttons': [
                {
                  'type': 'web_url',
                  'url': listing2.url,
                  'title': 'Check this out'
                }
              ]
            };
            giftResults.push(item);
          });

          let facebookData = {
            'facebook': {
              'attachment': {
                'type': 'template',
                'payload': {
                  'template_type': 'generic',
                  'elements': giftResults
                }
              }
            }
          };

          let responseJson = {
            data: facebookData,
            contextOut: outputContexts,
            displayText: "Check out these products!",
            speech: "Check out these products"
          };

          resp.json(responseJson);
        });
      } else {
        let responseJson = {
          displayText: "Sorry, I am having a little trouble finding a suitable gift for your needs. Can we try some different criteria?",
          speech: "Sorry, I am having a little trouble finding a suitable gift for your needs. Can we try some different criteria?"
        };
        resp.json(responseJson);
      }
    });
  }

  function showItems(inputContexts1, parameters1) {
    let giftReceiver;
    let giftItem;
    let offset = 0;
    let maxPrice;

    if (inputContexts1 && inputContexts1.length > 0) {
      let offsetContext;

      inputContexts1.forEach(function(context) {
        giftReceiver = giftReceiver || context.parameters['gift-receiver'];
        giftItem = giftItem || context.parameters['gift-item'];
        if (context.parameters['unit-currency']) {
          maxPrice = context.parameters['unit-currency'].amount;
        }
      });

    } else {
      giftReceiver = parameters1['gift-receiver'];
      giftItem = parameters1['gift-item'];
      if (parameters1['unit-currency']) {
        maxPrice = parameters1['unit-currency'].amount;
      }
    }

    let outputContexts = [
      {
        'name': 'number-items-shown',
        'lifespan': 10,
        'parameters':
        {
          'gift-item': giftItem,
          'gift-receiver': giftReceiver,
          'max-price': maxPrice,
          'offset': offset + 4
        }
      }
    ];

    sendResponse(giftItem, giftReceiver, offset, maxPrice, outputContexts);
  }

  function showMoreItems(inputContexts2) {
    let giftItem;
    let giftReceiver;
    let offset;
    let maxPrice;
    let outputContexts;

    inputContexts2.forEach(function(context) {
      if (context.name === 'number-items-shown') {
        giftReceiver = context.parameters['gift-receiver'];
        giftItem = context.parameters['gift-item'];
        maxPrice = context.parameters['max-price'];
        offset = parseInt(context.parameters.offset);
        context.parameters.offset = offset + 4;
        outputContexts = [context];
      }
    });

    sendResponse(giftItem, giftReceiver, offset, maxPrice, outputContexts);
  }
}
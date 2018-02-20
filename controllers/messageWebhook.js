const axios = require("axios");

module.exports = (req, resp) => {

  let query = 'jewelry for mom';
  let maxPrice = '50';
  let requestConfig = {
    baseURL: '', //api base url, deleted for public repo
    url: '/v3/public/search/listings?keywords=' + encodeURIComponent(query) + "&limit=4&offset=0&max_price=" + maxPrice,
    method: 'get',
    headers: {
      'x-api-key': '' //api key, deleted for public repo
    }
  };

  axios(requestConfig).then(function(response) {
    console.log('Received data:', response.data);
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
        console.log('images:', values);
        data.results.forEach(function(listing2, index) {
          let item =
          {
            'title': listing2.title,
            'image_url': values[index].data.results[0].url_fullxfull,
            'subtitle': '',
            'default_action': {
              'type': 'web_url',
              'url': listing2.url
            }
          };
          console.log('item:', item);
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
    }
  });
};

function fetchImage(listingId, imageId) {
  return ''; //fetch endpoint, deleted for public repo
}
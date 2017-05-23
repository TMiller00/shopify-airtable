require("dotenv").config();
var axios = require("axios");

// Environment variables
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const PASSWORD = process.env.PASSWORD;
const HOST_NAME = process.env.HOST_NAME;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const APP_NAME = process.env.APP_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

// API urls
const SHOPIFY_URL = "https://" + SHOPIFY_API_KEY + ":" + PASSWORD + "@" + HOST_NAME + ".myshopify.com/admin/products.json?fields=id,title,vendor";
const PUT_SHOPIFY_URL = "https://" + SHOPIFY_API_KEY + ":" + PASSWORD + "@" + HOST_NAME + ".myshopify.com/admin/themes/175972300/assets.json";
const COLLECTION_URL = "https://" + SHOPIFY_API_KEY + ":" + PASSWORD + "@" + HOST_NAME + ".myshopify.com/admin/custom_collections.json?product_id=";
const AIRTABLE_URL = "https://api.airtable.com/v0/" + APP_NAME + "/" + TABLE_NAME + "?api_key=" + AIRTABLE_API_KEY;

axios.all([getShopify(), getAirtable()])
    .then(axios.spread(function(shopify, airtable) {
        // Compares the list of current products with the list of current Airtable records
        // Updates and makes changes and marks item complete
        for (var i in shopify) {
            for (var j in airtable) {
                if (shopify[i].id == airtable[j].id) {
                    getCollectionsPatch(airtable[j].airtable_id, shopify[i].id, shopify[i].title);
                    shopify[i].complete = true;
                }
            }
        }

        // Check for new Products (i.e. incomplete records) and create them
        for (var k in shopify) {
            if (!(shopify[k].hasOwnProperty("complete"))) {
                getCollectionsPost(shopify[k].id, shopify[k].title);
                shopify[k].complete = true;
            }
        }

        getAirtableForPost()
    }));

// Retrieves a list of all products from the Shopify store with their ID, Title, and Vendor
function getShopify() {
    return axios.get(SHOPIFY_URL).then(function(response) {
        const products = response.data.products;
        const products_array = [];
        for (var a in products) {
            products_array.push(products[a]);
        }
        return products_array;
    }).catch(function(error) {
        console.log(error);
    });
}

// Retrieves all the records from an Airtable and returns the record ID and the Shopify product ID
function getAirtable() {
    return axios.get(AIRTABLE_URL).then(function(response) {
        const records = response.data.records;
        const records_array = [];
        for (var a in records) {
            records_array.push({
                "airtable_id": records[a].id,
                "id": records[a].fields.shopify_id
            });
        }
        return records_array;
    }).catch(function(error) {
        console.log(error);
    });
}

// Using a Shopify product ID, get product collection and call patchAirtable to
// update the related Airtable record
function getCollectionsPatch(airtable_id, product_id, product_title) {
    return axios.get(COLLECTION_URL + product_id).then(function(response) {
        let collection_title = response.data.custom_collections[0].title;
        patchAirtable(airtable_id, collection_title, product_title);
    }).catch(function(error) {
        console.log(error);
    });
}

// Updates a single Airtable record
function patchAirtable(airtable_id, collection_title, product_title) {
    axios.patch("https://api.airtable.com/v0/" + APP_NAME + "/" + TABLE_NAME + "/" + airtable_id + "?api_key=" + AIRTABLE_API_KEY, {
        "fields": {
            "collection": collection_title,
            "product_title": product_title
        }
    }).catch(function(error) {
        console.log(error);
    });
}

// Using a Shopify product ID, get product collection and call postAirtable to
// create a new Airtable record
function getCollectionsPost(product_id, product_title) {
    return axios.get(COLLECTION_URL + product_id).then(function(response) {
        let collection_title = response.data.custom_collections[0].title;
        postAirtable(product_id, collection_title, product_title);
    }).catch(function(error) {
        console.log(error);
    });
}

// Create a single Airtable record
function postAirtable(product_id, collection_title, product_title) {
    axios.post(AIRTABLE_URL, {
        "fields": {
            "shopify_id": product_id,
            "collection": collection_title,
            "product_title": product_title
        }
    }).catch(function(error) {
        console.log(error);
    });
}

// Grab all Airtable records to push to Shopify
function getAirtableForPost() {
    return axios.get(AIRTABLE_URL).then(function(response) {
        const records = response.data.records;
        const records_array = [];
        for (var a in records) {
            records_array.push(records[a].fields);
        }
        putAsset(records_array);
    }).catch(function(error) {
        console.log(error);
    });
}

// Convert array to Base64, put to Shopify Assets
function putAsset(asset) {
    const obj = JSON.stringify(asset);
    const objB64 = new Buffer(obj).toString("base64");

    axios.put(PUT_SHOPIFY_URL, {
        "asset": {
            "key": "assets\/test.json",
            "attachment": objB64
        }
    }).catch(function(error) {
        console.log(error);
    });
}
